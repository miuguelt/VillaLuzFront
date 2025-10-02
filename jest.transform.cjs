module.exports = {
  process(src, filename) {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
      const transformedCode = src.replace(/import\.meta\.env/g, 'globalThis.import_meta_env');
      return { code: transformedCode };
    }
    return { code: src };
  },
};