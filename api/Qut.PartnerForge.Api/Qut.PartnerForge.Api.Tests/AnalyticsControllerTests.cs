using Qut.PartnerForge.Api.Controllers;
using Qut.PartnerForge.Api.Interfaces;
using Qut.PartnerForge.Api.Models.Analytics;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Qut.PartnerForge.Api.Tests;

public class AnalyticsControllerTests
{
    [Fact]
    public async Task GetSummary_ReturnsOkWithServicePayload()
    {
        var expected = new AnalyticsSummaryDto(12, 5, 3, 4, 40, 9, 2, 1);
        var analytics = new Mock<IAnalyticsService>();
        analytics
            .Setup(a => a.GetSummaryAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = new AnalyticsController(analytics.Object);

        var response = await controller.GetSummary(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetOrganisationStats_ClampsLimitToMaximum()
    {
        var analytics = CreateStatsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetOrganisationStats(
            null, null, null, null, null, 100_000, CancellationToken.None);

        analytics.Verify(a => a.GetOrganisationStatsAsync(
            null, null, null, It.IsAny<string>(), It.IsAny<bool>(), 500, It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetOrganisationStats_ClampsNonPositiveLimitToOne()
    {
        var analytics = CreateStatsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetOrganisationStats(
            null, null, null, null, null, 0, CancellationToken.None);

        analytics.Verify(a => a.GetOrganisationStatsAsync(
            null, null, null, It.IsAny<string>(), It.IsAny<bool>(), 1, It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetOrganisationStats_UsesDefaultLimitWhenUnspecified()
    {
        var analytics = CreateStatsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetOrganisationStats(
            null, null, null, null, null, null, CancellationToken.None);

        analytics.Verify(a => a.GetOrganisationStatsAsync(
            null, null, null, It.IsAny<string>(), It.IsAny<bool>(), 100, It.IsAny<CancellationToken>()));
    }

    [Theory]
    [InlineData("totalCarrots")]
    [InlineData("id; DROP TABLE organisations")]
    [InlineData(null)]
    public async Task GetOrganisationStats_FallsBackToDefaultSortKey_WhenNotWhitelisted(string? sortBy)
    {
        var analytics = CreateStatsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetOrganisationStats(
            null, null, null, sortBy, null, null, CancellationToken.None);

        analytics.Verify(a => a.GetOrganisationStatsAsync(
            null, null, null, AnalyticsSortKeys.TotalProjects, It.IsAny<bool>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetOrganisationStats_PassesWhitelistedSortKeyThrough()
    {
        var analytics = CreateStatsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetOrganisationStats(
            null, null, null, AnalyticsSortKeys.EventsAttended, null, null, CancellationToken.None);

        analytics.Verify(a => a.GetOrganisationStatsAsync(
            null, null, null, AnalyticsSortKeys.EventsAttended, It.IsAny<bool>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>()));
    }

    [Theory]
    [InlineData("asc", false)]
    [InlineData("ASC", false)]
    [InlineData("desc", true)]
    [InlineData(null, true)]
    [InlineData("sideways", true)]
    public async Task GetOrganisationStats_TreatsOnlyAscAsAscending(string? direction, bool expectedDescending)
    {
        var analytics = CreateStatsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetOrganisationStats(
            null, null, null, null, direction, null, CancellationToken.None);

        analytics.Verify(a => a.GetOrganisationStatsAsync(
            null, null, null, It.IsAny<string>(), expectedDescending, It.IsAny<int>(),
            It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetOrganisationStats_ForwardsFilters()
    {
        var analytics = CreateStatsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetOrganisationStats(
            "acme", 7, "active", null, null, null, CancellationToken.None);

        analytics.Verify(a => a.GetOrganisationStatsAsync(
            "acme", 7, "active", It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetIntakes_ReturnsBadRequest_WhenYearRangeIsInverted()
    {
        var analytics = new Mock<IAnalyticsService>();
        var controller = new AnalyticsController(analytics.Object);

        var response = await controller.GetIntakes(2026, 2024, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(response.Result);
        analytics.Verify(
            a => a.GetIntakeSummaryAsync(
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetIntakes_ReturnsOrderedRows_WhenRangeIsValid()
    {
        var expected = new List<IntakeSummaryDto>
        {
            new(2025, "S1", "2025 S1", 10, 8, 5, 3),
            new(2025, "S2", "2025 S2", 12, 9, 2, 7)
        };
        var analytics = new Mock<IAnalyticsService>();
        analytics
            .Setup(a => a.GetIntakeSummaryAsync(2025, 2025, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = new AnalyticsController(analytics.Object);

        var response = await controller.GetIntakes(2025, 2025, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GetMostActivePartners_UsesDefaultLimitWhenUnspecified()
    {
        var analytics = new Mock<IAnalyticsService>();
        analytics
            .Setup(a => a.GetMostActivePartnersAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MostActivePartnerDto>());
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetMostActivePartners(null, CancellationToken.None);

        analytics.Verify(a => a.GetMostActivePartnersAsync(10, It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetMostActivePartners_ClampsLimitToMaximum()
    {
        var analytics = new Mock<IAnalyticsService>();
        analytics
            .Setup(a => a.GetMostActivePartnersAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MostActivePartnerDto>());
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetMostActivePartners(9_999, CancellationToken.None);

        analytics.Verify(a => a.GetMostActivePartnersAsync(500, It.IsAny<CancellationToken>()));
    }

    [Theory]
    [InlineData("name", "name")]
    [InlineData("NAME", "NAME")]
    [InlineData("lastProjectDate", "lastProjectDate")]
    [InlineData("nonsense", AnalyticsSortKeys.TotalProjects)]
    [InlineData(null, AnalyticsSortKeys.TotalProjects)]
    public void Resolve_AcceptsOnlyWhitelistedSortKeys(string? candidate, string expected)
    {
        Assert.Equal(expected, AnalyticsSortKeys.Resolve(candidate));
    }

    [Fact]
    public async Task GetUpcomingEvents_UsesDefaultLimitWhenUnspecified()
    {
        var analytics = CreateUpcomingEventsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetUpcomingEvents(null, CancellationToken.None);

        analytics.Verify(a => a.GetUpcomingEventsAsync(5, It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetUpcomingEvents_ClampsLimitToMaximum()
    {
        var analytics = CreateUpcomingEventsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetUpcomingEvents(9_999, CancellationToken.None);

        analytics.Verify(a => a.GetUpcomingEventsAsync(500, It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetUpcomingEvents_ClampsNonPositiveLimitToOne()
    {
        var analytics = CreateUpcomingEventsService();
        var controller = new AnalyticsController(analytics.Object);

        await controller.GetUpcomingEvents(0, CancellationToken.None);

        analytics.Verify(a => a.GetUpcomingEventsAsync(1, It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetUpcomingEvents_ReturnsOkWithServicePayload()
    {
        var expected = new List<UpcomingEventDto>
        {
            new(Guid.NewGuid(), "Industry Showcase", "showcase", new DateOnly(2026, 12, 1), "GP Campus", 4)
        };
        var analytics = new Mock<IAnalyticsService>();
        analytics
            .Setup(a => a.GetUpcomingEventsAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = new AnalyticsController(analytics.Object);

        var response = await controller.GetUpcomingEvents(null, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response.Result);
        Assert.Same(expected, ok.Value);
    }

    private static Mock<IAnalyticsService> CreateUpcomingEventsService()
    {
        var analytics = new Mock<IAnalyticsService>();
        analytics
            .Setup(a => a.GetUpcomingEventsAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<UpcomingEventDto>());
        return analytics;
    }

    private static Mock<IAnalyticsService> CreateStatsService()
    {
        var analytics = new Mock<IAnalyticsService>();
        analytics
            .Setup(a => a.GetOrganisationStatsAsync(
                It.IsAny<string?>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<OrganisationStatDto>());
        return analytics;
    }
}
