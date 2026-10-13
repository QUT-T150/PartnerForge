namespace Qut.PartnerForge.Api.Models;

/// <summary>
/// A long-lived credential that can be exchanged for a new access token, so a user is not
/// forced back to the login screen when their short-lived JWT expires.
/// </summary>
/// <remarks>
/// Only a SHA-256 hash of the token is stored. The raw value is returned to the caller once,
/// at issue time, and never persisted — a leak of this table therefore does not hand an
/// attacker usable sessions. Tokens are single-use: refreshing revokes the presented token
/// and issues a replacement (rotation), which is what makes reuse detectable.
/// </remarks>
public class RefreshToken
{
    /// <summary>Surrogate key.</summary>
    public Guid Id { get; set; }

    /// <summary>Owner of the token.</summary>
    public Guid UserId { get; set; }

    /// <summary>SHA-256 hash of the raw token, hex encoded.</summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>Absolute expiry. A token past this point is rejected even if never revoked.</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>When the token was issued.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Set when the token is consumed by a refresh, or revoked by logout or reuse detection.</summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>Hash of the token that superseded this one, so a rotation chain can be walked.</summary>
    public string? ReplacedByTokenHash { get; set; }

    /// <summary>Navigation to the owning user.</summary>
    public User User { get; set; } = null!;

    /// <summary>True when the token is neither expired nor revoked.</summary>
    public bool IsActive => RevokedAt == null && DateTime.UtcNow < ExpiresAt;
}
