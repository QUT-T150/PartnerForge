using Qut.PartnerForge.Api.Models;

namespace Qut.PartnerForge.Api.Interfaces;

/// <summary>
/// JWT issuance and credential hashing used by authentication and user controllers.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Creates a signed RS256 bearer token embedding role, faculty, organisation, and subject claims.
    /// </summary>
    /// <param name="user">User loaded with navigations required by <see cref="Qut.PartnerForge.Api.Services.AuthService"/> (at least role name).</param>
    /// <returns>Serialized JWT compact string.</returns>
    string GenerateJwtToken(User user);

    /// <summary>
    /// Produces a BCrypt hash for storage alongside the user record.
    /// </summary>
    string HashPassword(string password);

    /// <summary>
    /// Validates a plain-text password against a persisted BCrypt hash.
    /// </summary>
    bool VerifyPassword(string password, string hash);

    /// <summary>
    /// Creates a cryptographically random refresh token. The raw value is returned to the
    /// caller once and never persisted — only <see cref="HashRefreshToken"/> of it is stored.
    /// </summary>
    /// <returns>A URL-safe base64 string carrying 256 bits of entropy.</returns>
    string GenerateRefreshToken();

    /// <summary>
    /// Hashes a refresh token for storage and lookup.
    /// </summary>
    /// <remarks>
    /// SHA-256 rather than BCrypt: the token is already high-entropy random, so it is not
    /// brute-forceable and does not need a slow KDF. A fast hash also matters here because
    /// lookup is by hash on every refresh, and the column is indexed.
    /// </remarks>
    string HashRefreshToken(string rawToken);
}
