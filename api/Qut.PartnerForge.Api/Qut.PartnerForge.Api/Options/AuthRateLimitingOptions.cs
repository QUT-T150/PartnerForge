namespace Qut.PartnerForge.Api.Options;

/// <summary>
/// Configuration options for authentication endpoint rate limiting.
/// </summary>
public class AuthRateLimitingOptions
{
    /// <summary>
    /// Configuration section path in appsettings.json.
    /// </summary>
    public const string SectionName = "RateLimiting:Auth";

    /// <summary>
    /// Maximum number of permitted login requests within the time window.
    /// </summary>
    public int PermitLimit { get; set; } = 10;

    /// <summary>
    /// Time window duration in seconds for the rate limiter.
    /// </summary>
    public int WindowSeconds { get; set; } = 60;

    /// <summary>
    /// Maximum number of queued requests once permit limit is exhausted (default 0 for immediate 429 rejection).
    /// </summary>
    public int QueueLimit { get; set; } = 0;
}
