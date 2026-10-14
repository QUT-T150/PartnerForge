using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Interceptors;
using Qut.PartnerForge.Api.Models;
using Xunit;

namespace Qut.PartnerForge.Api.Tests;

/// <summary>
/// Request DTO validation (#42). The rules live as attributes on the positional parameters of
/// the request records, which is where [ApiController] model validation reads them from.
/// </summary>
public class DtoValidationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public DtoValidationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    // Mirrors MVC: run each primary-constructor parameter's validation attributes against the
    // matching property, then IValidatableObject if the per-field checks passed. Returns the
    // names of the failing members.
    private static List<string> Validate<T>(T instance) where T : notnull
    {
        var type = typeof(T);
        var ctor = type.GetConstructors()
            .OrderByDescending(c => c.GetParameters().Length)
            .First();

        var errors = new List<string>();
        foreach (var parameter in ctor.GetParameters())
        {
            var property = type.GetProperty(parameter.Name!)!;
            var value = property.GetValue(instance);
            var context = new ValidationContext(instance) { MemberName = parameter.Name };

            foreach (var attribute in parameter.GetCustomAttributes<ValidationAttribute>())
            {
                if (attribute.GetValidationResult(value, context) != ValidationResult.Success)
                    errors.Add(parameter.Name!);
            }
        }

        if (errors.Count == 0 && instance is IValidatableObject validatable)
        {
            errors.AddRange(validatable
                .Validate(new ValidationContext(instance))
                .SelectMany(r => r.MemberNames));
        }

        return errors;
    }

    private static SaveOrganisationRequest Org(
        string name = "Acme Pty Ltd",
        string? email = "info@acme.example",
        string? contactEmail = null,
        string status = "active",
        string? abn = null) =>
        new(null, name, abn, null, email, null, null, null, null, null, null, null, null,
            null, null, null, contactEmail, null, status, null);

    private static SaveProjectRequest Project(
        string type = "capstone",
        string semester = "S1",
        int year = 2026,
        string status = "ongoing",
        DateOnly? start = null,
        DateOnly? end = null,
        string title = "Partner portal") =>
        new(title, null, Guid.NewGuid(), null, type, semester, year, status, start, end, false,
            null, null, null, null, null, null, null);

    // ── Organisations ──

    [Fact]
    public void Organisation_Valid_Passes()
    {
        Assert.Empty(Validate(Org()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Organisation_BlankName_Fails(string name)
    {
        Assert.Contains("Name", Validate(Org(name: name)));
    }

    [Fact]
    public void Organisation_NameLongerThanColumn_Fails()
    {
        Assert.Contains("Name", Validate(Org(name: new string('a', 256))));
        Assert.Empty(Validate(Org(name: new string('a', 255))));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void Organisation_BlankOptionalEmail_Passes(string? email)
    {
        // The edit form posts "" for an empty input, which must stay valid.
        Assert.Empty(Validate(Org(email: email)));
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("two words@acme.example")]
    public void Organisation_InvalidEmail_Fails(string email)
    {
        Assert.Contains("Email", Validate(Org(email: email)));
        Assert.Contains("PrimaryContactEmail", Validate(Org(contactEmail: email)));
    }

    [Theory]
    [InlineData("unknown")]
    [InlineData("Active")]
    public void Organisation_StatusOutsideCheckConstraint_Fails(string status)
    {
        Assert.Contains("PartnershipStatus", Validate(Org(status: status)));
    }

    [Fact]
    public void Organisation_AbnLongerThanColumn_Fails()
    {
        Assert.Contains("Abn", Validate(Org(abn: new string('1', 21))));
    }

    // ── Projects ──

    [Fact]
    public void Project_Valid_Passes()
    {
        Assert.Empty(Validate(Project(start: new DateOnly(2026, 2, 1), end: new DateOnly(2026, 6, 1))));
    }

    [Theory]
    [InlineData("Capstone", "S1", "ongoing", "ProjectType")]
    [InlineData("capstone", "Semester 1", "ongoing", "Semester")]
    [InlineData("capstone", "S1", "done", "Status")]
    public void Project_ValuesOutsideCheckConstraints_Fail(string type, string semester, string status, string field)
    {
        Assert.Contains(field, Validate(Project(type: type, semester: semester, status: status)));
    }

    [Theory]
    [InlineData(2018)]
    [InlineData(2101)]
    public void Project_YearOutsideRange_Fails(int year)
    {
        Assert.Contains("Year", Validate(Project(year: year)));
    }

    [Fact]
    public void Project_EndBeforeStart_Fails()
    {
        var errors = Validate(Project(start: new DateOnly(2026, 6, 1), end: new DateOnly(2026, 2, 1)));
        Assert.Equal(new[] { "EndDate" }, errors);
    }

    [Fact]
    public void Project_TitleLongerThanColumn_Fails()
    {
        Assert.Contains("Title", Validate(Project(title: new string('t', 501))));
    }

    // ── Project applications ──

    [Fact]
    public void Application_OptionalEnumsMayBeNull()
    {
        var request = new SaveProjectApplicationRequest(Guid.NewGuid(), null, "Idea", null,
            null, null, null, null, false, null, null, null, null, null);
        Assert.Empty(Validate(request));
    }

    [Fact]
    public void Application_InvalidTypeSemesterAndYear_Fail()
    {
        var request = new SaveProjectApplicationRequest(Guid.NewGuid(), null, "Idea", null,
            "research", "S3", 1999, null, false, null, null, null, null, null);
        var errors = Validate(request);
        Assert.Contains("ProposedProjectType", errors);
        Assert.Contains("ProposedSemester", errors);
        Assert.Contains("ProposedYear", errors);
    }

    // ── Events ──

    [Fact]
    public void Event_NameTooLongAndEventTypeTooLong_Fail()
    {
        var request = new SaveEventRequest(new string('e', 256), null, new string('x', 51),
            new DateOnly(2026, 10, 1), null, null, null);
        var errors = Validate(request);
        Assert.Contains("Name", errors);
        Assert.Contains("EventType", errors);
    }

    [Fact]
    public void EventAttendance_InvalidEmail_Fails_BlankPasses()
    {
        static SaveEventAttendanceRequest Rsvp(string? email) =>
            new("Acme", "Sam", null, null, email, null, null, null, "yes", null);

        Assert.Contains("Email", Validate(Rsvp("sam-at-acme")));
        Assert.Empty(Validate(Rsvp("")));
        Assert.Empty(Validate(Rsvp(null)));
    }

    // ── Users and auth ──

    [Fact]
    public void User_InvalidEmail_Fails()
    {
        var request = new SaveUserRequest("nope", null, "Sam Lee", "admin", null, null, true);
        Assert.Contains("Email", Validate(request));
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("Password123!", true)]
    [InlineData("short", false)]
    public void User_PasswordIsOptionalButMustBeLongEnough(string? password, bool valid)
    {
        var request = new SaveUserRequest("sam@qut.example", password, "Sam Lee", "admin", null, null, true);
        Assert.Equal(valid, !Validate(request).Contains("Password"));
    }

    [Fact]
    public void User_PasswordLongerThanMax_Fails()
    {
        var request = new SaveUserRequest("sam@qut.example", new string('p', 129), "Sam Lee", "admin", null, null, true);
        Assert.Contains("Password", Validate(request));
    }

    [Fact]
    public void RegisterUser_PasswordRequired()
    {
        var request = new RegisterUserRequest("sam@qut.example", "", "Sam Lee", "admin", null);
        Assert.Contains("Password", Validate(request));
    }

    [Fact]
    public void Login_OversizedEmail_Fails()
    {
        Assert.Contains("Email", Validate(new LoginRequest(new string('a', 256), "x")));
    }

    // ── End to end through the real MVC pipeline ──

    [Fact]
    public async Task LoginEndpoint_OversizedEmail_Returns400WithFieldErrors()
    {
        var inMemoryDb = Guid.NewGuid().ToString();
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions) ||
                    d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                    d.ServiceType == typeof(ApplicationDbContext) ||
                    (d.ServiceType.FullName != null && d.ServiceType.FullName.Contains("EntityFrameworkCore"))
                ).ToList();
                foreach (var descriptor in descriptors)
                    services.Remove(descriptor);

                services.AddDbContext<ApplicationDbContext>((sp, options) =>
                {
                    options.UseInMemoryDatabase(inMemoryDb)
                           .AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>());
                });
            });
        }).CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new LoginRequest(new string('a', 300) + "@x.example", "Password123!"))
        };
        request.Headers.Add("X-Forwarded-For", "203.0.113.42");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = JsonNode.Parse(await response.Content.ReadAsStringAsync());
        var errors = body?["errors"]?.AsObject();
        Assert.NotNull(errors);
        // Key casing depends on the JSON naming policy; accept "Email" or "email".
        Assert.Contains(errors!, e => string.Equals(e.Key, "Email", StringComparison.OrdinalIgnoreCase));
    }
}
