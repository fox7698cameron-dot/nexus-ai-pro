// ================================================
// NEXUS AI PRO - Native SDK Header (C++)
// Unreal Engine / Game Engine Integration
// 2026-08-10 | Version 2.1.0
// ================================================
// Include in your Unreal / custom C++ game project
// to communicate with Nexus AI Pro backend.
// All communication is over HTTPS. No keys in source.
// ================================================

#pragma once

#include <string>
#include <functional>
#include <memory>
#include <map>
#include <vector>

namespace NexusAIPro {

// ── Types ────────────────────────────────────────

using JsonMap = std::map<std::string, std::string>;
using Callback = std::function<void(bool success, const std::string& data)>;

// Achievement rarity
enum class AchievementRarity {
    Common    = 0,
    Uncommon  = 1,
    Rare      = 2,
    Epic      = 3,
    Legendary = 4
};

struct Achievement {
    std::string id;
    std::string name;
    std::string description;
    std::string game;
    AchievementRarity rarity = AchievementRarity::Common;
    int points = 0;
    std::string unlockedAt;
};

struct GameProgress {
    std::string game;
    float completion = 0.0f;   // 0.0 – 100.0
    float playtime   = 0.0f;   // hours
    JsonMap custom;            // arbitrary game-specific fields
};

// ── Configuration ────────────────────────────────

struct NexusConfig {
    std::string baseUrl;         // e.g. "https://your-nexus-instance.com"
    std::string accessToken;     // JWT access token — load at runtime, never hard-code
    std::string userId;
    std::string provider;        // "epic" | "psn" | "xbox" | "steam" | "ubisoft"
    bool tlsVerify = true;       // always true in production
};

// ── Client ───────────────────────────────────────

/**
 * NexusClient — lightweight HTTPS client for game engine integration.
 *
 * Usage (Unreal Blueprint C++):
 *   NexusAIPro::NexusConfig cfg;
 *   cfg.baseUrl     = FString(TEXT("https://your-nexus.com")).GetString();
 *   cfg.accessToken = GetNexusTokenFromSecureStorage();  // load from secure vault
 *   cfg.userId      = CurrentUser->GetId();
 *   cfg.provider    = "epic";
 *
 *   auto client = NexusAIPro::NexusClient::Create(cfg);
 *   client->LogAchievement(ach, [](bool ok, const std::string& resp) {
 *       // handle result
 *   });
 */
class NexusClient {
public:
    static std::shared_ptr<NexusClient> Create(const NexusConfig& config);
    virtual ~NexusClient() = default;

    // Achievement tracking
    virtual void LogAchievement(const Achievement& achievement, Callback callback) = 0;

    // Game progress tracking
    virtual void UpdateGameProgress(const GameProgress& progress, Callback callback) = 0;

    // Generic analytics event
    virtual void TrackEvent(const std::string& eventName, const JsonMap& properties, Callback callback) = 0;

    // Auth — refresh the access token (call when a 401 is received)
    virtual void RefreshToken(const std::string& refreshToken, Callback callback) = 0;

    // Real-time analytics push (for streaming game metrics)
    virtual void PushAnalytics(const std::string& platform, const JsonMap& metrics, Callback callback) = 0;

    // Update project progress (for game dev tracking inside Nexus)
    virtual void UpdateProjectProgress(const std::string& projectId, float progress, const std::string& status, Callback callback) = 0;

protected:
    NexusClient() = default;
    NexusConfig m_config;

    /**
     * Build a secure Authorization header.
     * Token must be loaded from a runtime secret store — NEVER embed it in source.
     */
    std::string AuthHeader() const {
        return "Bearer " + m_config.accessToken;
    }
};

// ── Platform helpers ──────────────────────────────

/**
 * NexusPlatformUtil — utilities for detecting the current platform
 * and selecting the right Nexus endpoints.
 */
class NexusPlatformUtil {
public:
    enum class Platform { Windows, macOS, Linux, iOS, Android, UnknownPlatform };

    static Platform CurrentPlatform() {
#if defined(_WIN32)
        return Platform::Windows;
#elif defined(__APPLE__) && defined(__MACH__)
  #if TARGET_OS_IPHONE
        return Platform::iOS;
  #else
        return Platform::macOS;
  #endif
#elif defined(__linux__)
        return Platform::Linux;
#elif defined(__ANDROID__)
        return Platform::Android;
#else
        return Platform::UnknownPlatform;
#endif
    }

    static std::string PlatformName() {
        switch (CurrentPlatform()) {
            case Platform::Windows: return "windows";
            case Platform::macOS:   return "macos";
            case Platform::Linux:   return "linux";
            case Platform::iOS:     return "ios";
            case Platform::Android: return "android";
            default:                return "unknown";
        }
    }
};

} // namespace NexusAIPro
