import "dotenv/config";
import createApp from "./App";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

createApp.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`TRV API listening on port ${PORT}`);
});
