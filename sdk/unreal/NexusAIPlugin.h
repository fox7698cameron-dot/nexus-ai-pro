// ================================================
// NexusAIPlugin.h - Unreal Engine 5 SDK
// Nexus AI Pro Game Connector
// Updated: 2026-06-13
// ------------------------------------------------
// Usage:
//   #include "NexusAIPlugin.h"
//   UNexusAISubsystem* NexusAI =
//     GetGameInstance()->GetSubsystem<UNexusAISubsystem>();
//   NexusAI->Initialize(TEXT("API_KEY"), TEXT("PROJECT_ID"));
//   NexusAI->TrackEvent(TEXT("level_start"), TEXT("{}"));
// ================================================

#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "NexusAIPlugin.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FNexusAIEventDelegate,
    const FString&, EventName,
    const FString&, ResponseJson
);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FNexusAIAchievementDelegate,
    const FString&, AchievementId,
    const FString&, AchievementName
);

// ------------------------------------------------
// Achievement struct
// ------------------------------------------------
USTRUCT(BlueprintType)
struct FNexusAchievement
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    FString AchievementId;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    FString Name;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    FString Description;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    int32 Points = 0;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    bool bUnlocked = false;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    FString UnlockedAt;
};

// ------------------------------------------------
// Game session stats
// ------------------------------------------------
USTRUCT(BlueprintType)
struct FNexusSessionStats
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    FString SessionId;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    float SessionDurationSeconds = 0.f;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    int32 Level = 1;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    int32 Score = 0;

    UPROPERTY(BlueprintReadWrite, Category = "NexusAI")
    TMap<FString, FString> CustomData;
};

// ------------------------------------------------
// Main subsystem
// ------------------------------------------------
UCLASS()
class NEXUSAIPLUGIN_API UNexusAISubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    // ── Connection ────────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "NexusAI")
    void InitializeNexus(const FString& ApiKey, const FString& ProjectId,
                         const FString& BaseUrl = TEXT("https://api.nexusai.pro"));

    // ── Telemetry ─────────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "NexusAI")
    void TrackEvent(const FString& EventName, const FString& MetadataJson = TEXT("{}"));

    UFUNCTION(BlueprintCallable, Category = "NexusAI")
    void TrackPlayerStats(const FNexusSessionStats& Stats);

    UFUNCTION(BlueprintCallable, Category = "NexusAI")
    void TrackLevelComplete(const FString& LevelId, float Duration, int32 Score);

    // ── Achievements ──────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "NexusAI")
    void UnlockAchievement(const FString& AchievementId,
                           const FString& AchievementName = TEXT(""),
                           int32 Points = 0);

    UFUNCTION(BlueprintCallable, Category = "NexusAI")
    void FetchAchievements(const FString& GameId);

    // ── AI Integration ────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "NexusAI")
    void SendAIPrompt(const FString& Prompt, const FString& Model = TEXT("claude"));

    // ── Delegates ─────────────────────────────────

    UPROPERTY(BlueprintAssignable, Category = "NexusAI")
    FNexusAIEventDelegate OnEventTracked;

    UPROPERTY(BlueprintAssignable, Category = "NexusAI")
    FNexusAIAchievementDelegate OnAchievementUnlocked;

private:
    FString NexusApiKey;
    FString NexusProjectId;
    FString NexusBaseUrl;
    bool    bInitialized = false;

    TSharedPtr<IHttpRequest, ESPMode::ThreadSafe> MakeRequest(
        const FString& Endpoint,
        const FString& Method,
        const FString& Body
    );

    void HandleResponse(
        FHttpRequestPtr Request,
        FHttpResponsePtr Response,
        bool bConnected,
        FString EventName
    );
};

// ================================================
// Implementation (inline for single-file SDK)
// ================================================
#if defined(NEXUSAI_IMPLEMENTATION)

void UNexusAISubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    UE_LOG(LogTemp, Log, TEXT("[NexusAI] Subsystem initialized"));
}

void UNexusAISubsystem::Deinitialize()
{
    Super::Deinitialize();
}

void UNexusAISubsystem::InitializeNexus(
    const FString& ApiKey,
    const FString& ProjectId,
    const FString& BaseUrl)
{
    NexusApiKey    = ApiKey;
    NexusProjectId = ProjectId;
    NexusBaseUrl   = BaseUrl;
    bInitialized   = true;
    UE_LOG(LogTemp, Log, TEXT("[NexusAI] Connected: project=%s"), *ProjectId);
}

void UNexusAISubsystem::TrackEvent(
    const FString& EventName,
    const FString& MetadataJson)
{
    if (!bInitialized) { UE_LOG(LogTemp, Warning, TEXT("[NexusAI] Not initialized")); return; }

    FString Body = FString::Printf(
        TEXT("{\"event\":\"%s\",\"projectId\":\"%s\",\"metadata\":%s}"),
        *EventName, *NexusProjectId, *MetadataJson
    );
    auto Req = MakeRequest(TEXT("/api/projects/telemetry"), TEXT("POST"), Body);
    if (Req)
    {
        Req->OnProcessRequestComplete().BindUObject(this, &UNexusAISubsystem::HandleResponse, EventName);
        Req->ProcessRequest();
    }
}

void UNexusAISubsystem::UnlockAchievement(
    const FString& AchievementId,
    const FString& AchievementName,
    int32 Points)
{
    if (!bInitialized) return;

    FString Body = FString::Printf(
        TEXT("{\"gameId\":\"%s\",\"achievementId\":\"%s\",\"achievementName\":\"%s\",\"points\":%d,\"unlocked\":true}"),
        *NexusProjectId, *AchievementId, *AchievementName, Points
    );
    auto Req = MakeRequest(TEXT("/api/projects/game/achievements"), TEXT("POST"), Body);
    if (Req)
    {
        Req->OnProcessRequestComplete().BindLambda(
            [this, AchievementId, AchievementName](FHttpRequestPtr, FHttpResponsePtr Resp, bool ok)
            {
                if (ok && Resp.IsValid() && Resp->GetResponseCode() == 201)
                {
                    OnAchievementUnlocked.Broadcast(AchievementId, AchievementName);
                }
            }
        );
        Req->ProcessRequest();
    }
}

TSharedPtr<IHttpRequest, ESPMode::ThreadSafe> UNexusAISubsystem::MakeRequest(
    const FString& Endpoint,
    const FString& Method,
    const FString& Body)
{
    auto& Http = FHttpModule::Get();
    auto Req   = Http.CreateRequest();
    Req->SetURL(NexusBaseUrl + Endpoint);
    Req->SetVerb(Method);
    Req->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    Req->SetHeader(TEXT("Authorization"), FString::Printf(TEXT("Bearer %s"), *NexusApiKey));
    Req->SetContentAsString(Body);
    return Req;
}

void UNexusAISubsystem::HandleResponse(
    FHttpRequestPtr,
    FHttpResponsePtr Response,
    bool bConnected,
    FString EventName)
{
    if (!bConnected || !Response.IsValid())
    {
        UE_LOG(LogTemp, Warning, TEXT("[NexusAI] Request failed: %s"), *EventName);
        return;
    }
    OnEventTracked.Broadcast(EventName, Response->GetContentAsString());
}

#endif // NEXUSAI_IMPLEMENTATION
