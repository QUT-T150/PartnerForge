## 📌 Pull Request Overview

### Description
<!-- Provide a clear, concise summary of the changes made and the motivation behind them. -->

### Related Issue(s)
<!-- Link the issue(s) this PR addresses, e.g. Closes #11 or Part of #1 -->
- Closes #

---

## 🛠️ Type of Change
- [ ] 🚀 New Feature (non-breaking change adding new functionality)
- [ ] 🐛 Bug Fix (non-breaking change fixing an issue)
- [ ] 🔄 Refactor / Optimization (code quality, cleanup, performance)
- [ ] ⚙️ DevOps / CI / Branch Protection (workflow, tooling, infrastructure)
- [ ] 📝 Documentation (README, guides, schema specifications)

---

## 🧪 Verification & Testing

### Automated Checks
- [ ] **Frontend Tests**: `cd frontend && npm test` passes with 0 failures
- [ ] **Type Check**: `cd frontend && npm run type-check` passes with 0 errors
- [ ] **Frontend Build**: `cd frontend && npm run build` compiles successfully
- [ ] **Backend Tests**: `dotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/` passes
- [ ] **Backend Build**: `dotnet build api/Qut.PartnerForge.Api/Qut.PartnerForge.Api/` builds without errors

### Manual Verification
<!-- Describe the manual test steps performed to verify these changes. -->
1. 
2. 

---

## 🛡️ Review & Branch Protection Checklist
- [ ] PR targets the appropriate branch (`staging` for integration testing or `main` for releases)
- [ ] Branch protection rules enforced: **Minimum 1 approving review required**
- [ ] All automated CI checks are **green**
- [ ] No merge conflicts with the target branch
