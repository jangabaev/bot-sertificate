function escapeMarkdown(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[");
}

module.exports = {
  escapeMarkdown,
};
