using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Interfaces;
using Qut.PartnerForge.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Qut.PartnerForge.Api.Controllers;

/// <summary>
/// JWT authentication endpoints: login for all users and admin-only registration of staff accounts.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuthService _auth;
    private readonly IConfiguration _configuration;

    /// <summary>
    /// Initializes a new instance of <see cref="AuthController"/>.
    /// </summary>
    /// <param name="context">Database context.</param>
    /// <param name="auth">Password hashing and token issuance.</param>
    /// <param name="configuration">Token lifetime settings.</param>
    public AuthController(ApplicationDbContext context, IAuthService auth, IConfiguration configuration)
    {
        _context = context;
        _auth = auth;
        _configuration = configuration;
    }

    /// <summary>
    /// Authenticates a user by email and password and returns a signed JWT plus profile claims.
    /// </summary>
    /// <param name="request">Login credentials.</param>
    /// <returns>An <see cref="AuthResponse"/> with a bearer token when credentials are valid.</returns>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthLoginPolicy")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.DeletedAt == null);

        if (user == null || !user.IsActive || !_auth.VerifyPassword(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        user.LastLoginAt = DateTime.UtcNow;
        var response = await IssueTokensAsync(user);
        await _context.SaveChangesAsync();

        return Ok(response);
    }

    /// <summary>
    /// Exchanges a valid refresh token for a new access token and a replacement refresh token.
    /// </summary>
    /// <param name="request">The refresh token issued by a previous login or refresh.</param>
    /// <returns>A fresh <see cref="AuthResponse"/>, or 401 when the token is unknown, expired, or already used.</returns>
    /// <remarks>
    /// Tokens are single-use. Presenting one revokes it and returns a replacement, so a token
    /// captured and replayed by an attacker will arrive already revoked. That is treated as a
    /// compromise: every active token for the user is revoked, forcing a real re-login.
    /// </remarks>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Unauthorized(new { message = "Invalid refresh token." });

        var hash = _auth.HashRefreshToken(request.RefreshToken);

        var stored = await _context.RefreshTokens
            .Include(rt => rt.User)
                .ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash);

        if (stored == null)
            return Unauthorized(new { message = "Invalid refresh token." });

        // Reuse of an already-revoked token means the token leaked: the legitimate client
        // rotated it, so anyone still holding the old value should not have it.
        if (stored.RevokedAt != null)
        {
            await RevokeAllActiveTokensAsync(stored.UserId);
            await _context.SaveChangesAsync();
            return Unauthorized(new { message = "Refresh token has already been used. Please sign in again." });
        }

        if (DateTime.UtcNow >= stored.ExpiresAt)
            return Unauthorized(new { message = "Refresh token has expired. Please sign in again." });

        var user = stored.User;
        if (user == null || !user.IsActive || user.DeletedAt != null)
            return Unauthorized(new { message = "Account is no longer active." });

        var response = await IssueTokensAsync(user);

        stored.RevokedAt = DateTime.UtcNow;
        stored.ReplacedByTokenHash = _auth.HashRefreshToken(response.RefreshToken);

        await _context.SaveChangesAsync();
        return Ok(response);
    }

    /// <summary>
    /// Revokes a refresh token so it can no longer renew a session.
    /// </summary>
    /// <param name="request">The refresh token to revoke.</param>
    /// <remarks>
    /// Returns 204 whether or not the token was found. Logout should not be a probe that
    /// tells a caller which tokens exist, and a client clearing its own cookies has nothing
    /// useful to do with a failure either way.
    /// </remarks>
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(RefreshRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            var hash = _auth.HashRefreshToken(request.RefreshToken);
            var stored = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == hash && rt.RevokedAt == null);

            if (stored != null)
            {
                stored.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        return NoContent();
    }

    /// <summary>
    /// Creates a new staff account (course organiser or industry partner) or admin. Requires the <c>admin</c> role.
    /// </summary>
    /// <param name="request">Registration payload including role and optional faculty.</param>
    /// <returns>An <see cref="AuthResponse"/> with a token for the new user.</returns>
    [HttpPost("register")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterUserRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email && u.DeletedAt == null))
            return Conflict(new { message = "Email already registered." });

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.Role);
        if (role == null)
            return BadRequest(new { message = $"Invalid role '{request.Role}'. Valid values: admin, course_organiser, industry_partner." });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = _auth.HashPassword(request.Password),
            FullName = request.FullName,
            RoleId = role.Id,
            FacultyId = request.FacultyId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        user.Role = role;
        var response = await IssueTokensAsync(user);
        await _context.SaveChangesAsync();
        return Ok(response);
    }

    /// <summary>
    /// Issues an access token plus a new refresh token, and stages the refresh token for saving.
    /// </summary>
    /// <remarks>
    /// The caller is responsible for calling <c>SaveChangesAsync</c> — this keeps token issuance
    /// in the same transaction as whatever else the endpoint is writing (last-login stamp,
    /// user creation, revoking the token being rotated).
    /// </remarks>
    private async Task<AuthResponse> IssueTokensAsync(User user)
    {
        var rawRefreshToken = _auth.GenerateRefreshToken();

        await _context.RefreshTokens.AddAsync(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = _auth.HashRefreshToken(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenExpiryDays),
            CreatedAt = DateTime.UtcNow,
        });

        return new AuthResponse(
            Token: _auth.GenerateJwtToken(user),
            Email: user.Email,
            FullName: user.FullName,
            Role: user.Role.Name,
            FacultyId: user.FacultyId,
            OrganisationId: user.OrganisationId,
            RefreshToken: rawRefreshToken,
            ExpiresInSeconds: AccessTokenExpiryMinutes * 60
        );
    }

    /// <summary>Revokes every token still live for a user. Used when a token reuse is detected.</summary>
    private async Task RevokeAllActiveTokensAsync(Guid userId)
    {
        var now = DateTime.UtcNow;
        var active = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > now)
            .ToListAsync();

        foreach (var token in active)
            token.RevokedAt = now;
    }

    /// <summary>Access token lifetime in minutes, from <c>Jwt:ExpiryInMinutes</c>.</summary>
    private int AccessTokenExpiryMinutes =>
        int.TryParse(_configuration["Jwt:ExpiryInMinutes"], out var m) ? m : 15;

    /// <summary>Refresh token lifetime in days, from <c>Jwt:RefreshTokenExpiryInDays</c>.</summary>
    private int RefreshTokenExpiryDays =>
        int.TryParse(_configuration["Jwt:RefreshTokenExpiryInDays"], out var d) ? d : 14;
}
