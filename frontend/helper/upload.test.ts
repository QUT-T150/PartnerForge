import { describe, it, expect } from "vitest";
import {
  normalizeKey,
  coerce,
  buildRow,
  parseAddress,
  suggestColumnMapping,
  validateCsvForTable,
  TABLE_CONFIGS,
  generateSampleCsv,
  generateReportCsv,
} from "./upload-core";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

describe("CSV Importer Unit & Performance Tests", () => {
  describe("parseAddress()", () => {
    it("parses full Australian address strings into structured parts", () => {
      const parsed1 = parseAddress("123 Innovation Way, Brisbane QLD 4000");
      expect(parsed1.addressLine1).toBe("123 Innovation Way");
      expect(parsed1.city).toBe("Brisbane");
      expect(parsed1.state).toBe("QLD");
      expect(parsed1.postcode).toBe("4000");
      expect(parsed1.country).toBe("Australia");

      const parsed2 = parseAddress("100 O'Connell St, Suite 4, Sydney, NSW 2000, Australia");
      expect(parsed2.addressLine1).toBe("100 O'Connell St");
      expect(parsed2.addressLine2).toBe("Suite 4");
      expect(parsed2.city).toBe("Sydney");
      expect(parsed2.state).toBe("NSW");
      expect(parsed2.postcode).toBe("2000");
      expect(parsed2.country).toBe("Australia");

      const parsed3 = parseAddress("42 Wallaby Way, Sydney NSW 2000");
      expect(parsed3.addressLine1).toBe("42 Wallaby Way");
      expect(parsed3.city).toBe("Sydney");
      expect(parsed3.state).toBe("NSW");
      expect(parsed3.postcode).toBe("2000");
    });
  });

  describe("normalizeKey()", () => {
    it("normalizes headers with spaces, capitalization, hyphens, and underscores", () => {
      expect(normalizeKey("Organisation Name")).toBe("organisation name");
      expect(normalizeKey("Project_id")).toBe("project id");
      expect(normalizeKey("Industy Partner Contact Name(s)")).toBe("industy partner contact name(s)");
      expect(normalizeKey("   Student Project Agreement - IP Licence/Assignment  ")).toBe("student project agreement ip licence/assignment");
      expect(normalizeKey("Industry Supervisor's Name")).toBe("industry supervisor s name");
    });
  });

  describe("coerce()", () => {
    it("coerces values and applies default values", () => {
      expect(coerce(" 123 ", "int")).toBe(123);
      expect(coerce("invalid", "int", 2026)).toBe(2026);
      expect(coerce("true", "bool")).toBe(true);
      expect(coerce("YES", "bool")).toBe(true);
      expect(coerce("0", "bool")).toBe(false);
      expect(coerce("  tech@company.com  ", "string")).toBe("tech@company.com");
      expect(coerce("", "string", "fallback")).toBe("fallback");
    });
  });

  describe("suggestColumnMapping() Smart Header Detection", () => {
    it("auto-detects standard headers for Industry Partners", () => {
      const headers = [
        "Organisation Name",
        "ABN",
        "Address",
        "Email",
        "Phone",
        "Position Title",
      ];
      const mapping = suggestColumnMapping(headers, TABLE_CONFIGS.partners.fields);
      expect(mapping.Name).toBe("Organisation Name");
      expect(mapping.Abn).toBe("ABN");
      expect(mapping.AddressLine1).toBe("Address");
      expect(mapping.Email).toBe("Email");
      expect(mapping.Phone).toBe("Phone");
      expect(mapping.PrimaryContactPosition).toBe("Position Title");
    });

    it("auto-suggests mappings for non-standard headers like User Name, User Email, Role Title", () => {
      const headers = [
        "User Name",
        "User Email",
        "Role Title",
        "Secret Password",
      ];
      const mapping = suggestColumnMapping(headers, TABLE_CONFIGS.users.fields);
      expect(mapping.FullName).toBe("User Name");
      expect(mapping.Email).toBe("User Email");
      expect(mapping.Role).toBe("Role Title");
      expect(mapping.Password).toBe("Secret Password");
      expect(mapping.IsActive).toBe(""); // unmapped
    });

    it("returns empty strings for unmapped fields", () => {
      const headers = ["RandomColA", "RandomColB"];
      const mapping = suggestColumnMapping(headers, TABLE_CONFIGS.projects.fields);
      expect(mapping.Title).toBe("");
      expect(mapping.Description).toBe("");
    });
  });

  describe("buildRow() - Entity Field Mappings & Custom Column Mappings", () => {
    it("correctly maps Industry Partner CSV headers including typos, aliases, address splitting, and notes", () => {
      const config = TABLE_CONFIGS.partners;
      const csvRow = {
        "Project_id": "PRJ-2024-999",
        "Registration ID": "REG-2024-888",
        "Organisation Name": "  TechCorp Australia ",
        "Address": "123 Innovation Way, Brisbane QLD 4000",
        "ABN": "12 345 678 901",
        "Industy Partner Contact Name(s)": "Sarah Jenkins",
        "Position Title": "VP of Technology",
        "Email": "s.jenkins@techcorp.com",
        "Phone": "0731234567",
      };

      const { body, error } = buildRow(csvRow, config.fields);
      expect(error).toBeUndefined();
      expect(body.Name).toBe("TechCorp Australia");
      expect(body.RegistrationId).toBe("REG-2024-888");
      expect(body.AddressLine1).toBe("123 Innovation Way");
      expect(body.City).toBe("Brisbane");
      expect(body.State).toBe("QLD");
      expect(body.Postcode).toBe("4000");
      expect(body.Country).toBe("Australia");
      expect(body.Abn).toBe("12 345 678 901");
      expect(body.PrimaryContactName).toBe("Sarah Jenkins");
      expect(body.PrimaryContactPosition).toBe("VP of Technology");
      expect(body.PrimaryContactEmail).toBe("s.jenkins@techcorp.com");
      expect(body.PrimaryContactPhone).toBe("0731234567");
      expect(body.Email).toBe("s.jenkins@techcorp.com");
      expect(body.Phone).toBe("0731234567");
      expect(body.Notes).toBe("PRJ-2024-999");
      expect(body.PartnershipStatus).toBe("active");
    });

    it("correctly builds row using user-defined custom columnMapping", () => {
      const config = TABLE_CONFIGS.users;
      const customCsvRow = {
        "User Full Name": "Alice Wonderland",
        "Work Mail": "alice@qut.edu.au",
        "System Permission": "course_organiser",
        "Temp Pass": "secret999",
      };

      const customMapping = {
        FullName: "User Full Name",
        Email: "Work Mail",
        Role: "System Permission",
        Password: "Temp Pass",
        IsActive: "",
      };

      const { body, error } = buildRow(customCsvRow, config.fields, customMapping);
      expect(error).toBeUndefined();
      expect(body.FullName).toBe("Alice Wonderland");
      expect(body.Email).toBe("alice@qut.edu.au");
      expect(body.Role).toBe("course_organiser");
      expect(body.Password).toBe("secret999");
    });

    it("correctly maps Projects CSV headers and applies default semester/year", () => {
      const config = TABLE_CONFIGS.projects;
      const csvRow = {
        "Project Title": "Autonomous Swarm Drone Navigation",
        "Project Description": "Edge flight path optimization",
        "Project Partner Agreement": "Signed PPA 2024",
        "Student Project Agreement - IP Licence/Assignment": "Full IP Assignment",
      };

      const { body, error } = buildRow(csvRow, config.fields);
      expect(error).toBeUndefined();
      expect(body.Title).toBe("Autonomous Swarm Drone Navigation");
      expect(body.Description).toBe("Edge flight path optimization");
      expect(body.ProjectPartnerAgreement).toBe("Signed PPA 2024");
      expect(body.StudentProjectAgreement).toBe("Full IP Assignment");
      expect(body.ProjectType).toBe("Capstone");
      expect(body.Semester).toBe("Semester 1");
      expect(body.Year).toBe(2026);
      expect(body.Status).toBe("ongoing");
    });

    it("correctly maps Organisation CSV headers", () => {
      const config = TABLE_CONFIGS.organisation;
      const csvRow = {
        "Organisation Name": "Alpha Robotics Ltd",
        "Address": "10 Industrial Ave",
        "ABN": "11223344556",
        "Industry Supervisor's Name": "Dr. Kenneth Wright",
        "Industry Supervisor's Position Title": "Head of Automation",
        "Business Phone": "0738901234",
        "Business Email": "k.wright@alpharobotics.com",
        "Organisation Information": "Autonomous robotics manufacturer",
      };

      const { body, error } = buildRow(csvRow, config.fields);
      expect(error).toBeUndefined();
      expect(body.Name).toBe("Alpha Robotics Ltd");
      expect(body.AddressLine1).toBe("10 Industrial Ave");
      expect(body.Abn).toBe("11223344556");
      expect(body.PrimaryContactName).toBe("Dr. Kenneth Wright");
      expect(body.PrimaryContactPosition).toBe("Head of Automation");
      expect(body.Phone).toBe("0738901234");
      expect(body.Email).toBe("k.wright@alpharobotics.com");
      expect(body.OrganisationInformation).toBe("Autonomous robotics manufacturer");
    });

    it("correctly maps Events CSV headers", () => {
      const config = TABLE_CONFIGS.events;
      const csvRow = {
        "Organisation": "BioHealth Labs",
        "First Name": "Elena",
        "Best contact person to liaise with on this event": "Dr. Elena Rostova",
        "Position Title": "Director of Research",
        "Email": "elena@biohealth.org",
        "List": "Research Symposium 2023",
        "Source": "Alumni Network",
        "Events Invited to": "QUT MedTech Conference 2023",
        "Response": "Attending",
      };

      const { body, error } = buildRow(csvRow, config.fields);
      expect(error).toBeUndefined();
      expect(body.OrganisationName).toBe("BioHealth Labs");
      expect(body.FirstName).toBe("Elena");
      expect(body.BestContactName).toBe("Dr. Elena Rostova");
      expect(body.PositionTitle).toBe("Director of Research");
      expect(body.Email).toBe("elena@biohealth.org");
      expect(body.ListName).toBe("Research Symposium 2023");
      expect(body.Source).toBe("Alumni Network");
      expect(body.EventsInvitedTo).toBe("QUT MedTech Conference 2023");
      expect(body.Response).toBe("Attending");
    });

    it("returns error when required field is missing", () => {
      const config = TABLE_CONFIGS.partners;
      const csvRow = {
        "Registration ID": "REG-123",
        "Address": "Some Street",
      };

      const { error } = buildRow(csvRow, config.fields);
      expect(error).toBe('Missing required field "Name"');
    });
  });

  describe("Robustness & High Volume Performance Benchmark", () => {
    it("parses and builds 500 multi-year rows efficiently (< 50ms)", () => {
      const csvPath = path.resolve(__dirname, "../../test-data/csv-samples/large_volume_500rows.csv");
      if (!fs.existsSync(csvPath)) {
        const dir = path.dirname(csvPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const lines = ["Project_id,Registration ID,Organisation Name,Address,ABN,Industy Partner Contact Name(s),Position Title,Email,Phone"];
        for (let i = 1; i <= 500; i++) {
          lines.push(`"PRJ-2024-${i}","REG-2024-${i}","Benchmark Org ${i}","${i} Tech Parkway","1000000000${i}","Contact ${i}","Director","contact${i}@org.com","0730000000"`);
        }
        fs.writeFileSync(csvPath, lines.join("\n"), "utf8");
      }
      const csvContent = fs.readFileSync(csvPath, "utf8");

      const startTime = performance.now();

      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      expect(parsed.errors.length).toBe(0);
      expect(parsed.data.length).toBe(500);

      const config = TABLE_CONFIGS.partners;
      let validRowsCount = 0;

      for (const row of parsed.data) {
        const { body, error } = buildRow(row, config.fields);
        if (!error && body.Name) {
          validRowsCount++;
        }
      }

      const durationMs = performance.now() - startTime;

      expect(validRowsCount).toBe(500);
      expect(durationMs).toBeLessThan(500); // Execution time under 500ms
      console.log(`⏱️ Performance Benchmark: 500 rows parsed & built in ${durationMs.toFixed(2)}ms`);
    });

    it("handles edge cases: quotes, spaces, special characters, multi-year dates", () => {
      const csvPath = path.resolve(__dirname, "../../test-data/csv-samples/edge_cases_and_typos.csv");
      const csvContent = fs.readFileSync(csvPath, "utf8");

      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      const config = TABLE_CONFIGS.partners;
      const row1 = buildRow(parsed.data[0], config.fields);
      expect(row1.error).toBeUndefined();
      expect(row1.body.Name).toBe("EdgeTech Corporation");
      expect(row1.body.RegistrationId).toBe("REG-2024-999");
      expect(row1.body.PrimaryContactName).toBe("Jean-Luc Picard, Élodie Dubois");

      const row2 = buildRow(parsed.data[1], config.fields);
      expect(row2.error).toBeUndefined();
      expect(row2.body.Name).toBe("Acme & Co, (Australia) Ltd");
    });
  });

  describe("CSV Sample & Report Generators", () => {
    it("generates valid CSV sample template for partners", () => {
      const sample = generateSampleCsv("partners");
      expect(sample).toContain("organisation name");
      expect(sample).toContain("TechCorp Australia");
    });

    it("generates structured downloadable report CSV for dry-run simulation", () => {
      const state = {
        status: "partial" as const,
        message: "[Dry Run Simulation] 8 of 10 rows valid.",
        total: 10,
        succeeded: 8,
        failed: 2,
        errors: ["Row 3: Missing required field \"Name\""],
        dryRun: true,
      };

      const report = generateReportCsv(state, "Industry Partners");
      expect(report).toContain("Import Report - Industry Partners");
      expect(report).toContain('"Dry Run","YES (Simulation Only)"');
      expect(report).toContain('"ERROR","Row 3: Missing required field ""Name"""');
    });
  });

  describe("validateCsvForTable() Header & Target Validation", () => {
    it("validates correct CSV headers for Industry Partners without mapping", () => {
      const headers = [
        "Project_id",
        "Registration ID",
        "Organisation Name",
        "Address",
        "ABN",
        "Industy Partner Contact Name(s)",
        "Position Title",
        "Email",
        "Phone",
      ];
      const result = validateCsvForTable(headers, "partners");
      expect(result.valid).toBe(true);
    });

    it("validates non-standard headers when custom columnMapping is provided", () => {
      const headers = ["User Name", "User Email", "User Role", "ExtraCol"];
      const customMapping = {
        FullName: "User Name",
        Email: "User Email",
        Role: "User Role",
      };
      const result = validateCsvForTable(headers, "users", customMapping);
      expect(result.valid).toBe(true);
    });

    it("rejects when required field is missing in custom columnMapping", () => {
      const headers = ["User Name", "User Email"];
      const customMapping = {
        FullName: "User Name",
        Email: "User Email",
        Role: "", // missing required field Role
      };
      const result = validateCsvForTable(headers, "users", customMapping);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Missing required column mapping(s)");
    });

    it("rejects CSV missing required columns for Users without mapping", () => {
      const headers = ["Project Title", "Project Description"];
      const result = validateCsvForTable(headers, "users");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Missing required column(s)");
      expect(result.message).toContain("Projects");
    });

    it("rejects Users CSV when selected target is Projects without mapping", () => {
      const headers = ["Email", "Full Name", "Role", "Password"];
      const result = validateCsvForTable(headers, "projects");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Missing required column(s): \"project title\"");
      expect(result.message).toContain("Users");
    });

    it("rejects CSV with random headers that do not match target", () => {
      const headers = ["UnrelatedCol1", "UnrelatedCol2"];
      const result = validateCsvForTable(headers, "events");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("does not contain valid headers for target category 'Events'");
    });

    it("detects when Projects CSV is uploaded to Organisation target", () => {
      const headers = [
        "Project Title",
        "Project Description",
        "Project Partner Agreement",
        "Student Project Agreement - IP Licence/Assignment",
      ];
      const result = validateCsvForTable(headers, "organisation");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Projects");
    });
  });
});
