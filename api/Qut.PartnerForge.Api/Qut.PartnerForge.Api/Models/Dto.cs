using System.ComponentModel.DataAnnotations;

namespace Qut.PartnerForge.Api.Models;

// Validation attributes on the request records below are enforced automatically by
// [ApiController]: an invalid payload gets 400 with a ValidationProblemDetails body listing
// each failing field. Limits mirror Schema/schema.sql; see docs/validation-rules.md (#42).

// Auth DTOs

/// <summary>Credentials exchanged for <see cref="AuthResponse"/>.</summary>
/// <param name="Email">User email.</param>
/// <param name="Password">Plain-text password (transport should use HTTPS).</param>
public record LoginRequest(
    [Required, MaxLength(255)] string Email,
    [Required, MaxLength(ValidationLimits.PasswordMax)] string Password
);

/// <summary>
/// Admin-triggered onboarding payload for roles that authenticate against <see cref="User"/>.
/// </summary>
/// <param name="Email">Unique login email.</param>
/// <param name="Password">Initial password hashed server-side.</param>
/// <param name="FullName">Display name.</param>
/// <param name="Role">Logical role name (<c>admin</c>, <c>course_organiser</c>, <c>industry_partner</c>).</param>
/// <param name="FacultyId">Optional faculty for course organisers.</param>
public record RegisterUserRequest(
    [Required, MaxLength(255), EmailAddress] string Email,
    [Required, Password] string Password,
    [Required, MaxLength(255)] string FullName,
    [Required, MaxLength(50)] string Role,
    [Range(1, int.MaxValue)] int? FacultyId
);

/// <summary>Successful authentication payload.</summary>
/// <param name="Token">JWT bearer compact string.</param>
/// <param name="Email">Authenticated email claim.</param>
/// <param name="FullName">Human-readable profile name.</param>
/// <param name="Role">Authorisation role copied from <see cref="Role.Name"/>.</param>
/// <param name="FacultyId">Optional faculty routing for scoped queries.</param>
/// <param name="OrganisationId">Optional owning organisation when the user is an industry partner.</param>
/// <param name="RefreshToken">Single-use token for renewing <paramref name="Token"/> without re-entering credentials.</param>
/// <param name="ExpiresInSeconds">Lifetime of <paramref name="Token"/>, so the caller can refresh before it lapses.</param>
public record AuthResponse(
    string Token,
    string Email,
    string FullName,
    string Role,
    int? FacultyId,
    Guid? OrganisationId,
    string RefreshToken,
    int ExpiresInSeconds
);

/// <summary>Presents a refresh token in exchange for a new access token.</summary>
/// <param name="RefreshToken">The raw token issued by a previous login or refresh.</param>
public record RefreshRequest(
    [Required, MaxLength(512)] string RefreshToken
);

// Read-only list DTOs

/// <summary>Projection for organisation directory rows.</summary>
public record OrganisationListItemDto(
    Guid Id,
    string? RegistrationId,
    string Name,
    string? Abn,
    string? Industry,
    int? IndustryId,
    string? Email,
    string? Website,
    string? Phone,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? Postcode,
    string? Country,
    string? OrganisationInformation,
    string PartnershipStatus,
    string SubmissionStatus,
    string? PrimaryContactName,
    string? PrimaryContactPosition,
    string? PrimaryContactEmail,
    string? PrimaryContactPhone,
    string? Notes,
    int ProjectCount,
    int PendingApplicationCount,
    DateTime UpdatedAt,
    // Year of the organisation's earliest / most recent (non-deleted) project;
    // null when it has no projects. Answers partnership longevity and recency.
    int? FirstProjectYear,
    int? LatestProjectYear
);

/// <summary>Payload for organisation create/update controllers.</summary>
public record SaveOrganisationRequest(
    [MaxLength(100)] string? RegistrationId,
    [Required, MaxLength(255)] string Name,
    [MaxLength(20)] string? Abn,
    [Range(1, int.MaxValue)] int? IndustryId,
    [MaxLength(255), OptionalEmail] string? Email,
    [MaxLength(255)] string? Website,
    [MaxLength(50)] string? Phone,
    [MaxLength(255)] string? AddressLine1,
    [MaxLength(255)] string? AddressLine2,
    [MaxLength(100)] string? City,
    [MaxLength(100)] string? State,
    [MaxLength(20)] string? Postcode,
    [MaxLength(100)] string? Country,
    [MaxLength(ValidationLimits.LongText)] string? OrganisationInformation,
    // Split into contacts.first_name / last_name (100 each) by the controller.
    [MaxLength(200)] string? PrimaryContactName,
    [MaxLength(255)] string? PrimaryContactPosition,
    [MaxLength(255), OptionalEmail] string? PrimaryContactEmail,
    [MaxLength(50)] string? PrimaryContactPhone,
    [Required, AllowedValues("prospect", "active", "completed", "inactive")] string PartnershipStatus,
    [MaxLength(ValidationLimits.LongText)] string? Notes
);

/// <summary>Projection for listing or viewing projects.</summary>
public record ProjectListItemDto(
    Guid Id,
    string Title,
    string? Description,
    Guid OrganisationId,
    string OrganisationName,
    int? FacultyId,
    string? Faculty,
    string ProjectType,
    string Semester,
    int Year,
    string Status,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool MultipleTeams,
    string? DisciplineArea,
    string? SecondaryItDiscipline,
    string? ProjectDeliverables,
    string? ProjectPartnerAgreement,
    string? StudentProjectAgreement,
    string? IpAssignmentRationale,
    string? Notes,
    DateTime UpdatedAt
);

/// <summary>Payload for creating or replacing project fields.</summary>
public record SaveProjectRequest(
    [Required, MaxLength(500)] string Title,
    [MaxLength(ValidationLimits.LongText)] string? Description,
    Guid OrganisationId,
    [Range(1, int.MaxValue)] int? FacultyId,
    [Required, AllowedValues("capstone", "undergrad", "postgrad")] string ProjectType,
    [Required, AllowedValues("S1", "S2", "SS")] string Semester,
    [Range(ValidationLimits.YearMin, ValidationLimits.YearMax)] int Year,
    [Required, AllowedValues("proposed", "ongoing", "completed", "cancelled")] string Status,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool MultipleTeams,
    [MaxLength(255)] string? DisciplineArea,
    [MaxLength(255)] string? SecondaryItDiscipline,
    [MaxLength(ValidationLimits.LongText)] string? ProjectDeliverables,
    [MaxLength(ValidationLimits.LongText)] string? ProjectPartnerAgreement,
    [MaxLength(ValidationLimits.LongText)] string? StudentProjectAgreement,
    [MaxLength(ValidationLimits.LongText)] string? IpAssignmentRationale,
    [MaxLength(ValidationLimits.LongText)] string? Notes
) : IValidatableObject
{
    /// <summary>Cross-field rule: a project cannot end before it starts.</summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (StartDate is { } start && EndDate is { } end && end < start)
        {
            yield return new ValidationResult(
                "End date must be on or after the start date.",
                new[] { nameof(EndDate) });
        }
    }
}

/// <summary>Partner application row without linked <see cref="Project"/> metadata.</summary>
public record ProjectApplicationListItemDto(
    Guid Id,
    string ProposedTitle,
    string? ProposedDescription,
    Guid OrganisationId,
    string OrganisationName,
    Guid? ContactId,
    string? ContactName,
    string? ProposedProjectType,
    string? ProposedSemester,
    int? ProposedYear,
    int? ProposedFacultyId,
    string? ProposedFaculty,
    bool ProposedMultipleTeams,
    string? ProposedDisciplineArea,
    string? ProposedSecondaryItDiscipline,
    string? ProposedDeliverables,
    string? StudentProjectAgreement,
    string? IpAssignmentRationale,
    string ApplicationStatus,
    DateTime SubmittedAt
);

/// <summary>Payload describing a prospective project awaiting staff review.</summary>
public record SaveProjectApplicationRequest(
    Guid OrganisationId,
    Guid? ContactId,
    [Required, MaxLength(500)] string ProposedTitle,
    [MaxLength(ValidationLimits.LongText)] string? ProposedDescription,
    // Optional, but when present must satisfy chk_apps_type / chk_apps_semester.
    [AllowedValues(null, "capstone", "undergrad", "postgrad")] string? ProposedProjectType,
    [AllowedValues(null, "S1", "S2", "SS")] string? ProposedSemester,
    [Range(ValidationLimits.YearMin, ValidationLimits.YearMax)] int? ProposedYear,
    [Range(1, int.MaxValue)] int? ProposedFacultyId,
    bool ProposedMultipleTeams,
    [MaxLength(255)] string? ProposedDisciplineArea,
    [MaxLength(255)] string? ProposedSecondaryItDiscipline,
    [MaxLength(ValidationLimits.LongText)] string? ProposedDeliverables,
    [MaxLength(ValidationLimits.LongText)] string? StudentProjectAgreement,
    [MaxLength(ValidationLimits.LongText)] string? IpAssignmentRationale
);

/// <summary>Projection for calendars and attendee counts.</summary>
public record EventListItemDto(
    Guid Id,
    string Name,
    string? Description,
    string? EventType,
    DateOnly EventDate,
    string? Location,
    int? FacultyId,
    string? Faculty,
    string? Notes,
    int AttendanceCount,
    DateTime UpdatedAt
);

/// <summary>Payload describing an event surfaced to partners.</summary>
public record SaveEventRequest(
    [Required, MaxLength(255)] string Name,
    [MaxLength(ValidationLimits.LongText)] string? Description,
    [MaxLength(50)] string? EventType,
    DateOnly EventDate,
    [MaxLength(255)] string? Location,
    [Range(1, int.MaxValue)] int? FacultyId,
    [MaxLength(ValidationLimits.LongText)] string? Notes
);

/// <summary>Payload describing an event attendance / RSVP entry.</summary>
public record SaveEventAttendanceRequest(
    [MaxLength(255)] string? OrganisationName,
    [MaxLength(100)] string? FirstName,
    [MaxLength(255)] string? BestContactName,
    [MaxLength(255)] string? PositionTitle,
    [MaxLength(255), OptionalEmail] string? Email,
    [MaxLength(255)] string? ListName,
    [MaxLength(255)] string? Source,
    [MaxLength(ValidationLimits.LongText)] string? EventsInvitedTo,
    [MaxLength(255)] string? Response,
    [MaxLength(ValidationLimits.LongText)] string? Notes
);


/// <summary>Admin directory row for workforce accounts.</summary>
public record UserListItemDto(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    int? FacultyId,
    string? Faculty,
    Guid? OrganisationId,
    string? OrganisationName,
    bool IsActive,
    DateTime? LastLoginAt,
    DateTime UpdatedAt
);

/// <summary>Payload for provisioning or patching <see cref="User"/> profiles.</summary>
public record SaveUserRequest(
    [Required, MaxLength(255), EmailAddress] string Email,
    // Optional here: required on create (enforced in UsersController), unchanged when empty on update.
    [Password] string? Password,
    [Required, MaxLength(255)] string FullName,
    [Required, MaxLength(50)] string Role,
    [Range(1, int.MaxValue)] int? FacultyId,
    Guid? OrganisationId,
    bool IsActive
);
/// <summary>Single audit event with the acting user resolved for display.</summary>
public record AuditLogEntryDto(
    long Id,
    string TableName,
    Guid RecordId,
    string Action,
    Guid? ChangedBy,
    string? ChangedByName,
    string? ChangedByEmail,
    DateTime ChangedAt,
    string? OldValues,
    string? NewValues,
    string? IpAddress,
    string? UserAgent
);

/// <summary>Paged slice of the audit log plus the total row count for the active filters.</summary>
public record AuditLogPageDto(
    IReadOnlyList<AuditLogEntryDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
