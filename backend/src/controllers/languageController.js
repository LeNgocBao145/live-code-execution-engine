import Language from '../models/Language.js';

export async function listLanguages(req, res, next) {
  try {
    const languages = await Language.findAll();
    return res.json({
      total: languages.length,
      languages: languages.map(lang => ({
        id: lang.id,
        name: lang.name,
        runtime: lang.runtime,
        version: lang.version,
        default_time_limit_ms: lang.default_time_limit_ms,
        default_memory_mb: lang.default_memory_mb,
      })),
    });
  } catch (error) {
    console.error('[Controller] List languages error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getLanguage(req, res, next) {
  try {
    const { language_id } = req.params;
    const language = await Language.findById(language_id);

    if (!language) {
      return res.status(404).json({ error: 'Language not found' });
    }

    return res.json({
      id: language.id,
      name: language.name,
      runtime: language.runtime,
      version: language.version,
      template_code: language.template_code,
      file_name: language.file_name,
      default_time_limit_ms: language.default_time_limit_ms,
      default_memory_mb: language.default_memory_mb,
    });
  } catch (error) {
    console.error('[Controller] Get language error:', error);
    return res.status(500).json({ error: error.message });
  }
}
