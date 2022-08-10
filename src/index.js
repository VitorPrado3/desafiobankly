const express = require('express');
const app = express();

app.use(express.json());

app.use(require("./routes/routes"))

app.listen(3000)