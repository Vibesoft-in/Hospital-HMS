import { Types } from "mongoose";

export function getGroupFootnote(
  group: {
    _id: string | Types.ObjectId;
    groupFootnote?: string;
  },
  testPrintingMap: Map<string, { printFootnote: boolean; newPage: boolean }>
) {
  const mapEntry = testPrintingMap.get(group._id.toString());
  const newPage = mapEntry?.newPage ?? false;

  // If no map entry exists (e.g. WhatsApp/PDF path with no testPrinting config),
  // default to printing footnotes. Otherwise respect the per-group toggle.
  const shouldPrint = mapEntry ? mapEntry.printFootnote : true;
  if (!shouldPrint) return { newPage };

  return { groupFootnote: group.groupFootnote, newPage };
}
