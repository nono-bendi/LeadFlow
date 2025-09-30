const path = require("path");
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const apiRouter = require("./src/routes/api");

require("dotenv").config();

const app = express();

app.use(helmet());
app.use("/api", apiRouter);
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true })); // << pour req.body
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

const leadsRouter = require("./src/routes/leads");
app.use("/leads", leadsRouter);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((req, res) => res.status(404).send("Page non trouvée"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OK → http://localhost:${PORT}`));
