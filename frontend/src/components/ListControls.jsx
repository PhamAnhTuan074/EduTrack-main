// Nguoi code: Nguyễn Ngọc Phương. Pham vi: bo loc, tim kiem va sap xep danh sach.

export default function ListControls({
  meta,
  sortBy,
  order,
  pageSize,
  sortOptions,
  onPageChange,
  onSortChange,
  onOrderChange,
  onPageSizeChange
}) {
  const currentPage = meta?.page || 1;
  const totalPages = meta?.totalPages || 1;
  const total = meta?.total || 0;

  return (
    <div className="list-controls">
      <div className="list-controls-summary">
        <strong>{total}</strong>
        <span>bản ghi</span>
      </div>

      <label>
        Sắp xếp
        <select value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label>
        Thứ tự
        <select value={order} onChange={(e) => onOrderChange(e.target.value)}>
          <option value="asc">Tăng dần</option>
          <option value="desc">Giảm dần</option>
        </select>
      </label>

      <label>
        Mỗi trang
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </label>

      <div className="pagination-actions">
        <button type="button" className="secondary-button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          Trước
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button type="button" className="secondary-button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Sau
        </button>
      </div>
    </div>
  );
}
