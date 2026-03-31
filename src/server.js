import app from "./app.js";
import config from "./connfig/config.js";
import connectDB from "./db/db.js";

connectDB();

const PORT = config.PORT || 3500;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});     