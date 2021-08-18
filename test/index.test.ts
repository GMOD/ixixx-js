import { ixIxxStream } from "../src/";
import tmp from "tmp";
import fs from "fs";
import { Readable } from "stream";

tmp.setGracefulCleanup();

test("test", async () => {
  const mytext = Readable.from([
    "heart r222222222\n",
    "brain r333333333\n",
    "kidney r111111111\n",
  ]);
  const l1 = tmp.fileSync();
  const l2 = tmp.fileSync();
  await ixIxxStream(mytext, l1.name, l2.name);
  const r1 = fs.readFileSync(l1.name, "utf8");
  const r2 = fs.readFileSync(l2.name, "utf8");
  expect(r1).toMatchSnapshot();
  expect(r2).toMatchSnapshot();
});
