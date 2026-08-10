// ================================================
// NEXUS AI PRO - iOS/macOS Native SDK (Swift)
// Touch ID | Face ID | Retinal Scan | Keychain
// 2026-08-10 | Version 2.1.0
// ================================================
// Add this file to your Xcode project.
// Secrets MUST be loaded from Keychain — never hardcoded.
// ================================================

import Foundation
import LocalAuthentication
import Security

// ── Configuration ────────────────────────────────

/// NexusConfig — runtime configuration loaded from secure storage.
/// NEVER embed tokens or keys directly in source code.
public struct NexusConfig {
    public let baseURL: URL
    public let userId: String
    public let provider: String  // "epic" | "psn" | "xbox" | "steam" | "ubisoft"

    public init(baseURL: URL, userId: String, provider: String) {
        self.baseURL = baseURL
        self.userId = userId
        self.provider = provider
    }
}

// ── Keychain helper ──────────────────────────────

public enum NexusKeychain {
    private static let service = "com.nexusaipro.credentials"

    /// Store a secret in the iOS Keychain — encrypted at rest by the OS.
    @discardableResult
    public static func store(key: String, value: String) -> Bool {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String:   data
        ]
        SecItemDelete(query as CFDictionary) // remove existing
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    /// Retrieve a secret from the Keychain.
    public static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String:  true,
            kSecMatchLimit as String:  kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else { return nil }
        return value
    }

    /// Delete a secret from the Keychain.
    @discardableResult
    public static func delete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        return SecItemDelete(query as CFDictionary) == errSecSuccess
    }
}

// ── Biometric Authentication ──────────────────────

/// BiometricAuth — wraps LocalAuthentication for Touch ID, Face ID, and
/// (where available) Optic ID (Apple Vision Pro retinal-style auth).
public enum BiometricAuthType {
    case touchID, faceID, opticID, unavailable
}

public class NexusBiometricAuth {
    public static func availableType() -> BiometricAuthType {
        let ctx = LAContext()
        var error: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .unavailable
        }
        switch ctx.biometryType {
        case .touchID:  return .touchID
        case .faceID:   return .faceID
        case .opticID:  return .opticID
        default:        return .unavailable
        }
    }

    /// Trigger biometric prompt and call the completion handler on the main thread.
    public static func authenticate(
        reason: String = "Verify your identity to continue",
        fallbackTitle: String? = "Use Password",
        completion: @escaping (Bool, Error?) -> Void
    ) {
        let ctx = LAContext()
        ctx.localizedFallbackTitle = fallbackTitle ?? ""
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            DispatchQueue.main.async { completion(success, error) }
        }
    }

    /// Returns a human-readable name for the available biometric type.
    public static func typeName() -> String {
        switch availableType() {
        case .touchID:   return "Touch ID"
        case .faceID:    return "Face ID"
        case .opticID:   return "Optic ID"
        case .unavailable: return "Unavailable"
        }
    }
}

// ── Network client ────────────────────────────────

/// NexusAPIClient — authenticated HTTPS client for Nexus AI Pro.
/// Access tokens are loaded from Keychain on every request.
public class NexusAPIClient {
    private let config: NexusConfig
    private let session: URLSession
    private static let tokenKey = "nexus_access_token"

    public init(config: NexusConfig, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    /// Store a token securely in Keychain.
    public func storeToken(_ token: String) {
        NexusKeychain.store(key: Self.tokenKey, value: token)
    }

    /// Load the current access token from Keychain (nil if not set).
    private func accessToken() -> String? {
        NexusKeychain.load(key: Self.tokenKey)
    }

    private func buildRequest(path: String, method: String = "GET", body: Any? = nil) -> URLRequest? {
        guard let url = URL(string: path, relativeTo: config.baseURL) else { return nil }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // Load token from Keychain at request time — never cached in memory long-term
        if let token = accessToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        return req
    }

    private func perform<T: Decodable>(_ req: URLRequest, as type: T.Type, completion: @escaping (Result<T, Error>) -> Void) {
        session.dataTask(with: req) { data, resp, error in
            if let error { return completion(.failure(error)) }
            guard let data else { return completion(.failure(NSError(domain: "NexusSDK", code: -1))) }
            do {
                completion(.success(try JSONDecoder().decode(type, from: data)))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    // ── API methods ───────────────────────────────

    /// Track a game achievement.
    public func logAchievement(_ achievement: [String: Any], completion: @escaping (Bool) -> Void) {
        guard let req = buildRequest(path: "/api/game/achievement", method: "POST",
                                     body: ["userId": config.userId, "provider": config.provider, "achievement": achievement]) else {
            return completion(false)
        }
        perform(req, as: [String: Bool].self) { result in
            completion((try? result.get())?["ok"] ?? false)
        }
    }

    /// Update game progress.
    public func updateGameProgress(_ game: String, completion: Double, playtime: Double, extra: [String: Any] = [:], cb: @escaping (Bool) -> Void) {
        var progress: [String: Any] = ["completion": completion, "playtime": playtime]
        extra.forEach { progress[$0] = $1 }
        guard let req = buildRequest(path: "/api/game/progress", method: "POST",
                                     body: ["userId": config.userId, "provider": config.provider, "game": game, "progress": progress]) else {
            return cb(false)
        }
        session.dataTask(with: req) { _, resp, _ in
            cb((resp as? HTTPURLResponse)?.statusCode == 200)
        }.resume()
    }

    /// Push real-time analytics metrics.
    public func pushAnalytics(platform: String, metrics: [String: Any], cb: @escaping (Bool) -> Void) {
        guard let req = buildRequest(path: "/api/analytics/ingest", method: "POST",
                                     body: ["platform": platform, "metrics": metrics]) else { return cb(false) }
        session.dataTask(with: req) { _, resp, _ in
            cb((resp as? HTTPURLResponse)?.statusCode == 200)
        }.resume()
    }
}

// ── SwiftUI convenience (iOS 14+) ────────────────

#if canImport(SwiftUI)
import SwiftUI

/// NexusBiometricButton — drop-in SwiftUI biometric login button.
@available(iOS 14.0, macOS 11.0, *)
public struct NexusBiometricButton: View {
    public let onSuccess: () -> Void
    public let onFailure: (Error?) -> Void
    @State private var isAuthenticating = false

    public init(onSuccess: @escaping () -> Void, onFailure: @escaping (Error?) -> Void) {
        self.onSuccess = onSuccess
        self.onFailure = onFailure
    }

    public var body: some View {
        Button(action: authenticate) {
            HStack(spacing: 8) {
                Image(systemName: iconName())
                Text(NexusBiometricAuth.typeName())
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.blue.opacity(0.15))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.blue.opacity(0.5)))
            .cornerRadius(10)
        }
        .disabled(isAuthenticating)
    }

    private func authenticate() {
        isAuthenticating = true
        NexusBiometricAuth.authenticate { success, error in
            isAuthenticating = false
            if success { onSuccess() } else { onFailure(error) }
        }
    }

    private func iconName() -> String {
        switch NexusBiometricAuth.availableType() {
        case .touchID:  return "touchid"
        case .faceID:   return "faceid"
        case .opticID:  return "eye"
        case .unavailable: return "key.fill"
        }
    }
}
#endif
