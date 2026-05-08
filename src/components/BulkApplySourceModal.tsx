import React, { useState, useMemo, useEffect } from "react";
import { X, Search } from "lucide-react";
import { Modal } from "./ui";

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

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const activeQueries = [searchQuery.trim()].filter(Boolean);
    
    return rows.filter((row) => {
      const colData = columns.map((col) => {
        if (col.key === "sr" || col.type === "image" || col.type === "file") return null;
        const val = row[col.key];
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
  }, [rows, columns, searchQuery, decodeHtmlEntities]);

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
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-4xl max-h-[90vh] flex flex-col p-0">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold flex items-center gap-2">
          Select Rows for 
          <span className={`px-2 py-0.5 rounded text-sm font-bold ${context.sourceColor}`}>
            {context.sourceName}
          </span>
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-red-500 transition-colors p-1"
        >
          <X size={24} />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="Search rows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-gray-50/50">
        <div className="bg-white border rounded min-w-full inline-block align-middle overflow-hidden border-[length:medium] border-[#e0e0e0]">
          <table className="border-separate border-spacing-0 w-full text-[14px]">
            <thead className="sticky top-0 bg-[#f3f3f3] z-10 shadow-sm text-[14px]">
              <tr>
                <th className="sticky top-0 z-20 text-[14px] font-bold text-[#2f3d49] p-1.5 border-r-[length:medium] border-b-[length:medium] border-[#e0e0e0] bg-[#f3f3f3] text-center w-12">
                  <input
                    type="checkbox"
                    checked={areAllSelected}
                    onChange={handleToggleAll}
                    disabled={filteredRows.length === 0}
                    className="w-4 h-4 cursor-pointer align-middle"
                  />
                </th>
                {columns.filter(col => !col.archived).map((col) => (
                  <th key={col.key} className="sticky top-0 z-20 text-[14px] font-bold text-[#2f3d49] p-1.5 border-r-[length:medium] border-b-[length:medium] border-[#e0e0e0] bg-[#f3f3f3] text-left max-w-[200px]">
                    {col.name}
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
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50/50" : ""}`}
                    onClick={() => handleToggleRow(String(row.id))}
                  >
                    <td className="p-1.5 border-r-[length:medium] border-b-[length:medium] border-[#e0e0e0] bg-white overflow-hidden text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          handleToggleRow(String(row.id), e as any);
                        }}
                        className="w-4 h-4 cursor-pointer align-middle"
                      />
                    </td>
                    {columns.filter(col => !col.archived).map((col) => {
                      if (col.type === "image") {
                        return (
                          <td key={col.key} className="p-1.5 border-r-[length:medium] border-b-[length:medium] border-[#e0e0e0] bg-white overflow-hidden text-center min-w-[50px]">
                            {row[col.key] && (
                              <img src={getImageUrl(row[col.key])} alt="" className="w-10 h-10 object-contain mx-auto rounded" />
                            )}
                          </td>
                        );
                      }
                      
                      if (col.key === context.colKey) {
                        return (
                          <td key={col.key} className="p-1.5 border-r-[length:medium] border-b-[length:medium] border-[#e0e0e0] bg-white overflow-hidden min-w-[150px] max-w-[300px]">
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
                        <td key={col.key} className="p-1.5 border-r-[length:medium] border-b-[length:medium] border-[#e0e0e0] bg-white overflow-hidden text-sm font-medium text-gray-700 min-w-[100px] max-w-[200px] truncate">
                          {decodeHtmlEntities(String(row[col.key] || ""))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={columns.filter(col => !col.archived).length + 1} className="p-8 text-center text-gray-500 italic border-b-[length:medium] border-[#e0e0e0]">
                    No rows match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 rounded-b-lg shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-semibold transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(selectedRowIds)}
          disabled={selectedRowIds.size === 0}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded font-semibold transition-colors flex items-center gap-2"
        >
          Apply to Selected Rows ({selectedRowIds.size})
        </button>
      </div>
    </Modal>
  );
};
