require("dotenv").config();
const app = require("./src/app");
const scheduler = require("./src/automation/engine/Scheduler");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  scheduler.init();
});
   const recomendacaoRouter = require("./exemploRotaRecomendacao");
   app.use(recomendacaoRouter);