#!/usr/bin/env node
import { ixIxx } from "./index";

const [file, out1 = "out.ix", out2 = "out.ixx"] = process.argv.slice(2);

(async () => {
  await ixIxx(file, out1, out2);
})();
