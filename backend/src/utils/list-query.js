function parsePagination(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    isPaginated: query.page !== undefined || query.limit !== undefined
  };
}

function buildPaginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1)
  };
}

function parseSort(query, allowedSorts, fallback) {
  const sortBy = allowedSorts.includes(query.sortBy) ? query.sortBy : fallback;
  const order = String(query.order || "asc").toLowerCase() === "desc" ? "desc" : "asc";

  return { sortBy, order };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
  parseSort
};
