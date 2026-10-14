using System.ComponentModel.DataAnnotations;

namespace Qut.PartnerForge.Api.Models;

/// <summary>
/// Shared limits for request validation (#42). String lengths mirror the column sizes in
/// Schema/schema.sql so an oversized value is rejected with 400 instead of failing in MySQL
/// with a 500. See docs/validation-rules.md.
/// </summary>
public static class ValidationLimits
{
    /// <summary>
    /// Cap for TEXT columns. MySQL TEXT holds 65,535 bytes and utf8mb4 uses up to 4 bytes
    /// per character, so 16,000 characters always fits.
    /// </summary>
    public const int LongText = 16000;

    /// <summary>Upper bound for passwords; BCrypt only uses the first 72 bytes anyway.</summary>
    public const int PasswordMax = 128;

    public const int PasswordMin = 8;

    /// <summary>Matches CHECK (year BETWEEN 2019 AND 2100) on projects.</summary>
    public const int YearMin = 2019;
    public const int YearMax = 2100;
}

/// <summary>
/// Email check for optional fields. Null, empty and whitespace-only values are valid, because
/// the frontend form sends "" for a blank input; anything else must look like an email address.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class OptionalEmailAttribute : ValidationAttribute
{
    private static readonly EmailAddressAttribute Email = new();

    public OptionalEmailAttribute()
        : base("The {0} field is not a valid email address.") { }

    public override bool IsValid(object? value)
    {
        if (value is not string s || string.IsNullOrWhiteSpace(s)) return true;
        var trimmed = s.Trim();
        return !trimmed.Any(char.IsWhiteSpace) && Email.IsValid(trimmed);
    }
}

/// <summary>
/// Password rule for create/update payloads. Null or empty means "not supplied" (on update the
/// password is left unchanged, and the controller enforces presence on create); a supplied
/// password must be between <see cref="ValidationLimits.PasswordMin"/> and
/// <see cref="ValidationLimits.PasswordMax"/> characters.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class PasswordAttribute : ValidationAttribute
{
    public PasswordAttribute()
        : base($"The {{0}} field must be between {ValidationLimits.PasswordMin} and {ValidationLimits.PasswordMax} characters.") { }

    public override bool IsValid(object? value)
    {
        if (value is not string s || s.Length == 0) return true;
        return s.Length >= ValidationLimits.PasswordMin && s.Length <= ValidationLimits.PasswordMax;
    }
}
