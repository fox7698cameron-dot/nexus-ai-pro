// ================================================
// NexusAIKit.swift - iOS/macOS Native SDK
// Nexus AI Pro - Biometrics, Game Tracking & Auth
// Updated: 2026-06-13
// Supports: iOS 16+, macOS 13+, Xcode 15+
// ================================================

import Foundation
import LocalAuthentication
import CryptoKit
import UIKit

// ── Configuration ─────────────────────────────────
public struct NexusConfig {
    public let apiKey:     String
    public let projectId:  String
    public let baseURL:    URL
    public let appVersion: String

    public init(
        apiKey:     String,
        projectId:  String,
        baseURL:    URL    = URL(string: "https://api.nexusai.pro")!,
        appVersion: String = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    ) {
        self.apiKey     = apiKey
        self.projectId  = projectId
        self.baseURL    = baseURL
        self.appVersion = appVersion
    }
}

// ── Achievement model ─────────────────────────────
public struct NexusAchievement: Codable {
    public let id:          String
    public let name:        String
    public let description: String
    public let points:      Int
    public let unlocked:    Bool
    public let unlockedAt:  Date?
}

// ── Network error ─────────────────────────────────
public enum NexusError: Error, LocalizedError {
    case notInitialized
    case networkError(String)
    case biometricUnavailable
    case biometricFailed(String)
    case unauthorized
    case serverError(Int, String)

    public var errorDescription: String? {
        switch self {
        case .notInitialized:         return "NexusAI SDK not initialized. Call NexusAI.shared.configure()"
        case .networkError(let m):    return "Network error: \(m)"
        case .biometricUnavailable:   return "Biometric authentication is not available on this device"
        case .biometricFailed(let m): return "Biometric authentication failed: \(m)"
        case .unauthorized:           return "Invalid API key or unauthorized access"
        case .serverError(let c, let m): return "Server error \(c): \(m)"
        }
    }
}

// ── Main SDK class ────────────────────────────────
@MainActor
public final class NexusAI {

    public static let shared = NexusAI()

    private init() {}

    private var config: NexusConfig?
    private var session = URLSession(configuration: .default)
    private var accessToken: String?

    // ── Configuration ──────────────────────────────

    public func configure(_ config: NexusConfig) {
        self.config = config
        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = 30
        sessionConfig.httpAdditionalHeaders = [
            "X-App-Version": config.appVersion,
            "X-SDK": "NexusAI-Swift/2.0",
        ]
        self.session = URLSession(configuration: sessionConfig)
    }

    // ── Biometric Authentication ───────────────────

    /// Authenticate using Face ID, Touch ID, or Optic ID (Vision Pro).
    /// Falls back to device passcode if biometric fails.
    public func authenticateWithBiometrics(
        reason: String = "Sign in to Nexus AI Pro",
        completion: @escaping (Result<Bool, NexusError>) -> Void
    ) {
        let context = LAContext()
        var authError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &authError) else {
            completion(.failure(.biometricUnavailable))
            return
        }

        context.evaluatePolicy(
            .deviceOwnerAuthentication,
            localizedReason: reason
        ) { success, error in
            DispatchQueue.main.async {
                if success {
                    completion(.success(true))
                } else {
                    let msg = error?.localizedDescription ?? "Authentication cancelled"
                    completion(.failure(.biometricFailed(msg)))
                }
            }
        }
    }

    /// Check what biometric types are available
    public func availableBiometricType() -> String {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return "none"
        }
        switch context.biometryType {
        case .faceID:    return "Face ID"
        case .touchID:   return "Touch ID"
        case .opticID:   return "Optic ID"
        default:         return "none"
        }
    }

    // ── Event Tracking ─────────────────────────────

    public func trackEvent(
        name: String,
        metadata: [String: Any] = [:],
        completion: ((Result<Void, NexusError>) -> Void)? = nil
    ) {
        guard let config else {
            completion?(.failure(.notInitialized))
            return
        }

        var body: [String: Any] = [
            "event":     name,
            "projectId": config.projectId,
            "platform":  "ios",
            "metadata":  metadata,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
        ]

        post(path: "/api/projects/telemetry", body: body) { result in
            switch result {
            case .success: completion?(.success(()))
            case .failure(let e): completion?(.failure(e))
            }
        }
    }

    // ── Achievement Tracking ───────────────────────

    public func unlockAchievement(
        id:          String,
        name:        String,
        description: String = "",
        points:      Int    = 0,
        gameId:      String? = nil,
        completion:  ((Result<Void, NexusError>) -> Void)? = nil
    ) {
        guard let config else {
            completion?(.failure(.notInitialized))
            return
        }

        let body: [String: Any] = [
            "gameId":          gameId ?? config.projectId,
            "achievementId":   id,
            "achievementName": name,
            "description":     description,
            "points":          points,
            "unlocked":        true,
            "platform":        "ios",
        ]

        post(path: "/api/projects/game/achievements", body: body) { result in
            switch result {
            case .success: completion?(.success(()))
            case .failure(let e): completion?(.failure(e))
            }
        }
    }

    /// Fetch all achievements for the current user
    public func fetchAchievements(completion: @escaping (Result<[NexusAchievement], NexusError>) -> Void) {
        get(path: "/api/projects/game/achievements") { result in
            switch result {
            case .success(let data):
                do {
                    let decoder = JSONDecoder()
                    decoder.keyDecodingStrategy  = .convertFromSnakeCase
                    decoder.dateDecodingStrategy = .iso8601
                    let response = try decoder.decode([String: [NexusAchievement]].self, from: data)
                    completion(.success(response["achievements"] ?? []))
                } catch {
                    completion(.failure(.networkError(error.localizedDescription)))
                }
            case .failure(let e):
                completion(.failure(e))
            }
        }
    }

    // ── Keychain Token Storage ─────────────────────

    public func storeToken(_ token: String, for key: String = "nexus_access_token") throws {
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String:   data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw NexusError.biometricFailed("Keychain write failed: \(status)")
        }
    }

    public func retrieveToken(for key: String = "nexus_access_token") -> String? {
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String:  true,
            kSecMatchLimit as String:  kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // ── E2E Encryption (CryptoKit) ─────────────────

    public func encryptMessage(_ message: String) -> (ciphertext: Data, nonce: Data, tag: Data)? {
        guard let msgData = message.data(using: .utf8) else { return nil }
        do {
            let key   = SymmetricKey(size: .bits256)
            let box   = try AES.GCM.seal(msgData, using: key)
            return (box.ciphertext, box.nonce.dataRepresentation, box.tag)
        } catch { return nil }
    }

    public func hashData(_ data: String) -> String {
        let d = SHA512.hash(data: Data(data.utf8))
        return d.compactMap { String(format: "%02x", $0) }.joined()
    }

    // ── Private helpers ────────────────────────────

    private func post(path: String, body: [String: Any], completion: @escaping (Result<Data, NexusError>) -> Void) {
        guard let config else { completion(.failure(.notInitialized)); return }

        guard let url = URL(string: path, relativeTo: config.baseURL),
              let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            completion(.failure(.networkError("Invalid URL or body")))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(config.apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = bodyData

        session.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error { completion(.failure(.networkError(error.localizedDescription))); return }
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                guard let data else { completion(.failure(.networkError("No data"))); return }
                if status == 401 { completion(.failure(.unauthorized)); return }
                if !(200..<300 ~= status) {
                    let msg = String(data: data, encoding: .utf8) ?? "Unknown"
                    completion(.failure(.serverError(status, msg)))
                    return
                }
                completion(.success(data))
            }
        }.resume()
    }

    private func get(path: String, completion: @escaping (Result<Data, NexusError>) -> Void) {
        guard let config else { completion(.failure(.notInitialized)); return }
        guard let url = URL(string: path, relativeTo: config.baseURL) else {
            completion(.failure(.networkError("Invalid URL")))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(config.apiKey)", forHTTPHeaderField: "Authorization")

        session.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error { completion(.failure(.networkError(error.localizedDescription))); return }
                guard let data else { completion(.failure(.networkError("No data"))); return }
                completion(.success(data))
            }
        }.resume()
    }
}

// ── Nonce data extension ──────────────────────────
extension AES.GCM.Nonce {
    var dataRepresentation: Data { Data(self) }
}
