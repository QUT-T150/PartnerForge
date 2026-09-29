using System.Diagnostics;
using System.Security.Claims;
using Qut.PartnerForge.Api.Controllers;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Qut.PartnerForge.Api.Tests;

public class BulkUploadIntegrationTests
{
    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static ControllerContext CreateAdminContext()
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, "admin")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
    }

    [Fact]
    public async Task CreateOrganisation_PopulatesMultiYearPartnerData()
    {
        await using var context = CreateContext();
        var controller = new OrganisationsController(context)
        {
            ControllerContext = CreateAdminContext()
        };

        var multiYearRequests = new[]
        {
            new SaveOrganisationRequest("REG-2022-01", "TechCorp 2022", "11223344556", null, "tech@corp.com", null, "0731234567", "123 Way", null, "Brisbane", "QLD", "4000", "Australia", "Info 2022", "Sarah Jenkins", "VP Tech", "sarah@tech.com", "0731234567", "active", "PRJ-2022-01"),
            new SaveOrganisationRequest("REG-2024-05", "BioHealth 2024", "22334455667", null, "bio@health.org", null, "0732345678", "456 Blvd", null, "Milton", "QLD", "4064", "Australia", "Info 2024", "Dr. Elena Rostova", "Director", "elena@bio.org", "0732345678", "active", "PRJ-2024-05"),
            new SaveOrganisationRequest("REG-2026-99", "NextGen AI 2026", "33445566778", null, "ai@nextgen.edu", null, "0733456789", "788 Rd", null, "Kelvin Grove", "QLD", "4059", "Australia", "Info 2026", "Liam Nguyen", "Lead AI", "liam@nextgen.edu", "0733456789", "prospect", "PRJ-2026-99"),
        };

        foreach (var req in multiYearRequests)
        {
            var result = await controller.CreateOrganisation(req);
            Assert.IsType<CreatedAtActionResult>(result.Result);
        }

        var orgs = await context.Organisations.Include(o => o.Contacts).ToListAsync();
        Assert.Equal(3, orgs.Count);
        Assert.Contains(orgs, o => o.Name == "TechCorp 2022");
        Assert.Contains(orgs, o => o.Name == "BioHealth 2024");
        Assert.Contains(orgs, o => o.Name == "NextGen AI 2026");

        var techCorp = orgs.First(o => o.Name == "TechCorp 2022");
        Assert.Single(techCorp.Contacts);
        Assert.Equal("Sarah Jenkins", techCorp.Contacts.First().FirstName + " " + techCorp.Contacts.First().LastName);
    }

    [Fact]
    public async Task CreateOrganisationsBatch_WithPrimaryContacts_InsertsOrganisationsAndContacts()
    {
        await using var context = CreateContext();
        var controller = new OrganisationsController(context)
        {
            ControllerContext = CreateAdminContext()
        };

        var requests = new[]
        {
            new SaveOrganisationRequest("REG-BATCH-01", "Batch Alpha", "11111111111", null, "alpha@batch.com", null, "0731111111", "1 Alpha St", null, "Brisbane", "QLD", "4000", "Australia", "Batch Org Alpha", "Alice Allison", "Director", "alice@batch.com", "0731111111", "active", null),
            new SaveOrganisationRequest("REG-BATCH-02", "Batch Beta", "22222222222", null, "beta@batch.com", null, "0732222222", "2 Beta St", null, "Brisbane", "QLD", "4000", "Australia", "Batch Org Beta", "Bob Roberts", "Lead Architect", "bob@batch.com", "0732222222", "active", null),
        };

        var actionResult = await controller.CreateOrganisationsBatch(requests);
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        Assert.NotNull(okResult.Value);

        var orgs = await context.Organisations.Include(o => o.Contacts).ToListAsync();
        Assert.Equal(2, orgs.Count);
        Assert.Contains(orgs, o => o.Name == "Batch Alpha");
        Assert.Contains(orgs, o => o.Name == "Batch Beta");

        var alphaOrg = orgs.First(o => o.Name == "Batch Alpha");
        Assert.Single(alphaOrg.Contacts);
        Assert.Equal("Alice", alphaOrg.Contacts.First().FirstName);
        Assert.Equal("Allison", alphaOrg.Contacts.First().LastName);
    }

    [Fact]
    public async Task CreateProjectsBatch_AppliesDefaultsAndUsesUnassignedPlaceholder()
    {
        await using var context = CreateContext();
        var controller = new ProjectsController(context)
        {
            ControllerContext = CreateAdminContext()
        };

        var req2023 = new SaveProjectRequest(
            Title: "AI Drone Swarm 2023",
            Description: "Edge optimization",
            OrganisationId: Guid.Empty,
            FacultyId: null,
            ProjectType: "",
            Semester: "",
            Year: 0,
            Status: "",
            StartDate: null,
            EndDate: null,
            MultipleTeams: false,
            DisciplineArea: null,
            SecondaryItDiscipline: null,
            ProjectDeliverables: "Deliverables 2023",
            ProjectPartnerAgreement: "PPA 2023",
            StudentProjectAgreement: "SPA 2023",
            IpAssignmentRationale: null,
            Notes: null
        );

        var result = await controller.CreateProjectsBatch(new[] { req2023 });
        Assert.IsType<OkObjectResult>(result.Result);

        var savedProject = await context.Projects.Include(p => p.Organisation).SingleAsync();
        Assert.Equal("AI Drone Swarm 2023", savedProject.Title);
        Assert.Equal("Capstone", savedProject.ProjectType);
        Assert.Equal("Semester 1", savedProject.Semester);
        Assert.Equal(DateTime.UtcNow.Year, savedProject.Year);
        Assert.Equal("ongoing", savedProject.Status);
        Assert.NotNull(savedProject.Organisation);
        Assert.Equal(ProjectsController.UnassignedImportOrganisationName, savedProject.Organisation.Name);
    }

    [Fact]
    public async Task CreateProjectsBatch_UnmatchedOrganisation_NeverFallsBackToAnExistingPartner()
    {
        await using var context = CreateContext();
        var existing = new Organisation { Id = Guid.NewGuid(), Name = "Real Partner Pty Ltd", SubmissionStatus = "approved" };
        context.Organisations.Add(existing);
        await context.SaveChangesAsync();

        var controller = new ProjectsController(context)
        {
            ControllerContext = CreateAdminContext()
        };

        var requests = new[]
        {
            new SaveProjectRequest("Orphan One", null, Guid.Empty, null, "Capstone", "Semester 1", 2026, "ongoing", null, null, false, null, null, null, null, null, null, null),
            new SaveProjectRequest("Orphan Two", null, Guid.NewGuid(), null, "Capstone", "Semester 1", 2026, "ongoing", null, null, false, null, null, null, null, null, null, null),
        };

        var result = await controller.CreateProjectsBatch(requests);
        Assert.IsType<OkObjectResult>(result.Result);

        var projects = await context.Projects.Include(p => p.Organisation).ToListAsync();
        Assert.Equal(2, projects.Count);
        Assert.All(projects, p =>
        {
            Assert.NotEqual(existing.Id, p.OrganisationId);
            Assert.Equal(ProjectsController.UnassignedImportOrganisationName, p.Organisation.Name);
        });
        Assert.Single(context.Organisations.Where(o => o.Name == ProjectsController.UnassignedImportOrganisationName));
    }

    [Fact]
    public async Task CreateProjectsBatch_ValidRequests_InsertsAllProjects()
    {
        await using var context = CreateContext();
        var controller = new ProjectsController(context)
        {
            ControllerContext = CreateAdminContext()
        };

        var requests = new[]
        {
            new SaveProjectRequest("Autonomous Vehicle Navigation", "Lidar SLAM mapping", Guid.Empty, null, "Capstone", "Semester 1", 2026, "ongoing", null, null, false, null, null, "Vehicle Prototype", "Signed PPA", "IP Assignment", null, null),
            new SaveProjectRequest("Quantum Key Distribution", "Post-quantum cryptography", Guid.Empty, null, "Postgrad", "Semester 2", 2026, "ongoing", null, null, false, null, null, "Crypto Library", "Signed PPA", "IP Assignment", null, null),
        };

        var actionResult = await controller.CreateProjectsBatch(requests);
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        Assert.NotNull(okResult.Value);

        var projects = await context.Projects.Include(p => p.Organisation).ToListAsync();
        Assert.Equal(2, projects.Count);
        Assert.Contains(projects, p => p.Title == "Autonomous Vehicle Navigation");
        Assert.Contains(projects, p => p.Title == "Quantum Key Distribution");
    }

    [Fact]
    public async Task CreateAttendance_ResolvesOrCreatesOrganisationAndEvent()
    {
        await using var context = CreateContext();
        var controller = new EventsController(context)
        {
            ControllerContext = CreateAdminContext()
        };

        var req1 = new SaveEventAttendanceRequest(
            OrganisationName: "CyberGuard Defence",
            FirstName: "David",
            BestContactName: "David O'Connor",
            PositionTitle: "CISO",
            Email: "d.oconnor@cyberguard.com",
            ListName: "Cyber Summit 2023",
            Source: "Direct Invitation",
            EventsInvitedTo: "QUT Cyber Security Summit 2023",
            Response: "Attending",
            Notes: "VIP Guest"
        );

        var result = await controller.CreateAttendance(req1);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var org = await context.Organisations.SingleAsync(o => o.Name == "CyberGuard Defence");
        var ev = await context.Events.SingleAsync(e => e.Name == "QUT Cyber Security Summit 2023");
        var attendance = await context.EventAttendances.SingleAsync();

        Assert.Equal(org.Id, attendance.OrganisationId);
        Assert.Equal(ev.Id, attendance.EventId);
        Assert.Equal("David", attendance.FirstName);
        Assert.Equal("David O'Connor", attendance.BestContactName);
        Assert.Equal("Attending", attendance.Response);
    }

    [Fact]
    public async Task BulkIngestion_PerformanceBenchmark_500RowsUnder15Seconds()
    {
        await using var context = CreateContext();
        var controller = new OrganisationsController(context)
        {
            ControllerContext = CreateAdminContext()
        };

        var requests = new List<SaveOrganisationRequest>();
        for (int i = 1; i <= 500; i++)
        {
            requests.Add(new SaveOrganisationRequest(
                RegistrationId: $"REG-{2022 + (i % 5)}-{i}",
                Name: $"Benchmark Org {i}",
                Abn: $"1000000{i:D4}",
                IndustryId: null,
                Email: $"info@org{i}.com",
                Website: null,
                Phone: "0730000000",
                AddressLine1: $"{i} Innovation Dr",
                AddressLine2: null,
                City: "Brisbane",
                State: "QLD",
                Postcode: "4000",
                Country: "Australia",
                OrganisationInformation: "High throughput test org",
                PrimaryContactName: $"Contact {i}",
                PrimaryContactPosition: "Manager",
                PrimaryContactEmail: $"contact{i}@org{i}.com",
                PrimaryContactPhone: "0730000000",
                PartnershipStatus: "active",
                Notes: null
            ));
        }

        var sw = Stopwatch.StartNew();
        var result = await controller.CreateOrganisationsBatch(requests);
        sw.Stop();

        Assert.IsType<OkObjectResult>(result.Result);
        var count = await context.Organisations.CountAsync();
        Assert.Equal(500, count);
        Assert.True(sw.ElapsedMilliseconds < 15000, $"Bulk ingestion took {sw.ElapsedMilliseconds}ms, expected < 15000ms");
    }
}
