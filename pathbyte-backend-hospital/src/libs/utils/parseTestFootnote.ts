import { Types } from "mongoose";

export function getTestFootnote(
  test: {
    testId: string | Types.ObjectId;
    test?: { footNote?: string } | null;
    footNote?: string;
  },
  testPrintingMap: Map<string, { printFootnote: boolean; newPage: boolean }>
) {
  const mapEntry = testPrintingMap.get(test.testId.toString());
  const newPage = mapEntry?.newPage ?? false;

  // If no map entry exists (e.g. WhatsApp/PDF path with no testPrinting config),
  // default to printing footnotes. Otherwise respect the per-test toggle.
  const shouldPrint = mapEntry ? mapEntry.printFootnote : true;
  if (!shouldPrint) return { newPage };

  const footnote = test.footNote || test.test?.footNote || "";
  return footnote ? { footnote, newPage } : { newPage };
}
