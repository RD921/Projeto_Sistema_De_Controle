require("dotenv").config();
const app = require("./src/app");
const scheduler = require("./src/automation/engine/Scheduler");
const financialEventsCron = require("./src/automation/engine/FinancialEventsCron");
const waitResumer = require("./src/automation/engine/WaitResumer");
const segmentRecalcCron = require("./src/automation/engine/SegmentRecalcCron");
const crmTasksCron = require("./src/automation/engine/CrmTasksCron");
const sacSlaCron = require("./src/automation/engine/SacSlaCron");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  scheduler.init();
  financialEventsCron.init();
  waitResumer.init();
  segmentRecalcCron.init();
  crmTasksCron.init();
  sacSlaCron.init();
});