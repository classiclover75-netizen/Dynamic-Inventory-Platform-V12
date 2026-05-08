import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import { Search, ArrowLeft, LayoutList } from "lucide-react";
import { Modal, Button, Input } from "./ui";

interface RowData {
  id: string;
  [key: string]: any;
}

interface Column {
  key: string;
  name: string;
  type: string;
  archived?: boolean;
}

interface BulkApplySourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: RowData[];
  columns: Column[];
  context: {
    sourceName: string;
    sourceColor: string;
    colKey: string;
  } | null;
  onConfirm: (selectedRowIds: Set<string>) => void;
  decodeHtmlEntities: (html: string) => string;
  parseMultiSource: (val: any) => any[];
  getImageUrl: (val: any) => string;
}

export const BulkApplySourceModal: React.FC<BulkApplySourceModalProps> = ({
  isOpen,
  onClose,
  rows,
  columns,
  context,
  onConfirm,
  decodeHtmlEntities,
  parseMultiSource,
  getImageUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const initialSelected = new Set(rows.map(r => String(r.id)));
      setSelectedRowIds(initialSelected);
    }
  }, [isOpen, rows]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const getCellValue = (row: RowData, col: Column) => {
    if (col.key === 'sr') {
      return rows.findIndex(r => r.id === row.id) + 1;
    }
    if (col.key === 'remaining_qty') {
      const total = parseFloat(String(row.total_qty || 0)) || 0;
      const saleCols = columns.filter(c => c.type === 'sale_tracker');
      const totalSales = saleCols.reduce((sum, c) => sum + (parseFloat(String(row[c.key] || 0)) || 0), 0);
      return String(total - totalSales);
    }
    if (col.type === 'sale_tracker') {
      return String(row[col.key] || '0');
    }
    return row[col.key];
  };

  const highlightText = (text: string, query: string) => {
    const cleanText = text
      ? String(text)
          .replace(/<[^>]*>/g, "")
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/&nbsp;/gi, " ")
      : "";
    if (!query || !cleanText) return cleanText;
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return cleanText;

    const escapedStrings = tokens.map((t) => {
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let bStart = "";
      let bEnd = "";
      if (/^[0-9]/.test(t)) {
        bStart = "(?<![0-9])";
        bEnd = "";
      } else if (/^[a-zA-Z]/.test(t)) {
        if (t.length <= 2) {
          bStart = "(?<![a-zA-Z])";
          bEnd = "(?![a-zA-Z]{2,})";
        } else {
          bStart = "";
          bEnd = "";
        }
      }
      return bStart + escaped + bEnd;
    });

    const regex = new RegExp("(" + escapedStrings.join("|") + ")", "gi");
    const parts = cleanText.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="bg-yellow-300 text-black font-bold px-[1px] rounded-sm"
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const filteredRows = useMemo(() => {
    if (!deferredSearchQuery.trim()) return rows;
    const activeQueries = [deferredSearchQuery.trim()].filter(Boolean);
    
    return rows.filter((row) => {
      const colData = columns.map((col) => {
        if (col.key === "sr" || col.type === "image" || col.type === "file") return null;
        const val = getCellValue(row, col);
        const strVal = Array.isArray(val) ? val.map((v: any) => (typeof v === 'object' ? JSON.stringify(v) : v)).join(" ") : val !== null && val !== undefined ? String(val) : "";
        const cleanVal = decodeHtmlEntities(strVal).replace(/<!--[\s\S]*?-->/g, "").replace(/<br\s*\/?>/gi, " ").replace(/&nbsp;/gi, " ").toLowerCase();
        return { name: col.name.toLowerCase(), val: cleanVal };
      }).filter(Boolean) as { name: string; val: string }[];

      const globalBlob = colData.map((c) => c.val).join(" ");

      return activeQueries.some((query) => {
        let targetBlob = globalBlob;
        let searchString = query.toLowerCase();
        const colonIndex = searchString.indexOf(":");
        if (colonIndex > 0) {
          const prefix = searchString.substring(0, colonIndex).trim();
          const suffix = searchString.substring(colonIndex + 1).trim();
          const matchedCol = colData.find((c) => c.name.includes(prefix) || prefix.includes(c.name));
          if (matchedCol) {
            targetBlob = matchedCol.val;
            searchString = suffix;
          }
        }
        const tokens = searchString.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return true;
        return tokens.every((t) => {
          const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp(escaped, "i").test(targetBlob);
        });
      });
    });
  }, [rows, columns, deferredSearchQuery, decodeHtmlEntities]);

  const areAllSelected = useMemo(() => {
    if (filteredRows.length === 0) return false;
    return filteredRows.every((r) => selectedRowIds.has(String(r.id)));
  }, [filteredRows, selectedRowIds]);

  const handleToggleAll = () => {
    if (areAllSelected) {
      const newSelected = new Set(selectedRowIds);
      filteredRows.forEach((r) => newSelected.delete(String(r.id)));
      setSelectedRowIds(newSelected);
    } else {
      const newSelected = new Set(selectedRowIds);
      filteredRows.forEach((r) => newSelected.add(String(r.id)));
      setSelectedRowIds(newSelected);
    }
  };

  const handleToggleRow = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const newSelected = new Set(selectedRowIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRowIds(newSelected);
  };

  if (!context) return null;

  const targetCol = columns.find(c => c.key === context.colKey);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          ⚡ Apply Source:
          <span className={`px-2 py-0.5 rounded text-[14px] font-bold ${context.sourceColor}`}>
            {context.sourceName}
          </span>
        </span>
      }
      width="95vw"
      noScroll={true}
    >
      <div className="flex flex-col h-[85vh] p-4">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-3 items-center w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Filter rows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                const newSelected = new Set(selectedRowIds);
                filteredRows.forEach((r) => newSelected.add(String(r.id)));
                setSelectedRowIds(newSelected);
              }}
              className="px-3 py-1.5 h-auto text-sm"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const newSelected = new Set(selectedRowIds);
                filteredRows.forEach((r) => newSelected.delete(String(r.id)));
                setSelectedRowIds(newSelected);
              }}
              className="px-3 py-1.5 h-auto text-sm"
            >
              Select None
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded relative bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
              <tr>
                <th className="p-2 border text-center w-12">
                  <input
                    type="checkbox"
                    checked={areAllSelected}
                    onChange={handleToggleAll}
                    disabled={filteredRows.length === 0}
                    className="w-4 h-4 cursor-pointer align-middle"
                  />
                </th>
                {columns.filter(col => !col.archived).map((col, i) => (
                  <th key={col.key} className="p-2 border text-left">
                    <div className="flex items-center gap-1 font-bold whitespace-nowrap">
                      {i + 1}. {col.name} {col.archived || col.key === 'sr' || col.key === 'remaining_qty' ? '🔒' : ''}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const isSelected = selectedRowIds.has(String(row.id));
                const currentSources = parseMultiSource(row[context.colKey]);
                
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50"
                  >
                    <td 
                      className="p-2 border text-center cursor-pointer"
                      onClick={() => handleToggleRow(String(row.id))}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          handleToggleRow(String(row.id), e as any);
                        }}
                        className="w-4 h-4 cursor-pointer align-middle accent-[#2b579a]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    {columns.filter(col => !col.archived).map((c) => {
                      const rawVal = getCellValue(row, c);

                      if (c.type === "image") {
                        return (
                          <td key={c.key} className="p-2 border whitespace-pre-wrap break-words min-w-[50px]">
                            {rawVal && (
                              <img src={getImageUrl(rawVal)} alt="" className="w-10 h-10 object-contain mx-auto rounded" />
                            )}
                          </td>
                        );
                      }
                      
                      if (c.key === context.colKey) {
                        return (
                          <td key={c.key} className="p-2 border whitespace-pre-wrap break-words min-w-[150px]">
                            <div className="flex flex-wrap gap-1">
                               {currentSources.length > 0 ? (
                                  currentSources.map((src: any, sIdx: number) => (
                                     <span key={sIdx} className={`px-1.5 py-0.5 rounded text-[12px] font-bold ${src.color}`}>
                                        {src.source}: {src.qty}
                                     </span>
                                  ))
                               ) : (
                                  <span className="text-gray-400 italic text-xs">No sources</span>
                               )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={c.key} className="p-2 border whitespace-pre-wrap break-words min-w-[150px]">
                          {highlightText(
                            decodeHtmlEntities(String(rawVal || "")),
                            deferredSearchQuery
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={columns.filter(col => !col.archived).length + 1} className="p-4 text-center text-gray-500 font-medium">
                    No data matches your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t sticky bottom-0 bg-white z-10 pb-2 shrink-0">
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md">
            {selectedRowIds.size} rows selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Cancel
            </Button>
            <Button
              variant="dark"
              onClick={() => onConfirm(selectedRowIds)}
              disabled={selectedRowIds.size === 0}
              className="flex items-center gap-2 !bg-[#2b579a] hover:!bg-[#1a3c6d] text-white"
            >
              ⚡ Apply Source
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
