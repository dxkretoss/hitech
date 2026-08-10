import React from 'react';

export const Table = ({ columns, data, emptyMessage = 'No records found' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.header || idx}
                className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={row.id || rowIdx} className="hover:bg-indigo-50/30 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">
                    {col.accessor ? row[col.accessor] : col.cell ? col.cell(row) : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
