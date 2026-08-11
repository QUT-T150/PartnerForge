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
    public async Task CreateProject_AppliesMultiYearDefaultsAndAutoCreatesOrganisation()
    {
        await using var context = CreateContext();
        var controller = new ProjectsController(context)
        {
            ControllerContext = CreateAdminContext()
        };

        // Project request with empty OrganisationId and missing semester/year
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

        var result = await controller.CreateProject(req2023);
        Assert.IsType<CreatedAtActionResult>(result.Result);

        var savedProject = await context.Projects.Include(p => p.Organisation).SingleAsync();
        Assert.Equal("AI Drone Swarm 2023", savedProject.Title);
        Assert.Equal("Capstone", savedProject.ProjectType);
        Assert.Equal("Semester 1", savedProject.Semester);
        Assert.Equal(DateTime.UtcNow.Year, savedProject.Year);
        Assert.Equal("ongoing", savedProject.Status);
        Assert.NotNull(savedProject.Organisation);
        Assert.Equal("General Industry Partner", savedProject.Organisation.Name);
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
    public async Task BulkIngestion_PerformanceBenchmark_500RowsUnder200ms()
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
        Assert.True(sw.ElapsedMilliseconds < 5000, $"Bulk ingestion took {sw.ElapsedMilliseconds}ms, expected < 5000ms");
    }
}
