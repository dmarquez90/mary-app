import { useState } from 'react'
import { useT, useLanguage, MONEDAS } from '../i18n'
import { Field, PrimaryBtn, inputCls, selectCls } from '../components'

const LS_CONFIG = 'mary_config'

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(LS_CONFIG)) || {} } catch { return {} }
}

export default function Configuracion() {
  const t = useT()
  const { lang, setLang } = useLanguage()
  const [config, setConfig] = useState(loadConfig)
  const [saved, setSaved] = useState(false)

  const set = k => e => setConfig(c => ({ ...c, [k]: e.target.value }))

  const save = () => {
    localStorage.setItem(LS_CONFIG, JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">{t('config_title')}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t('config_sub')}</p>
      </div>

      {/* IDIOMA */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-50">
          {t('config_section_lang')}
        </h2>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">{t('config_lang_label')}</label>
          <div className="flex gap-3">
            <button
              onClick={() => setLang('es')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                lang === 'es'
                  ? 'border-[#1D9E75] bg-[#f0fdf8] text-[#1D9E75]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="text-base">🇪🇸</span> {t('config_lang_es')}
              {lang === 'es' && <span className="ml-1 text-xs bg-[#1D9E75] text-white px-1.5 py-0.5 rounded-full">activo</span>}
            </button>
            <button
              onClick={() => setLang('en')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                lang === 'en'
                  ? 'border-[#1D9E75] bg-[#f0fdf8] text-[#1D9E75]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="text-base">🇺🇸</span> {t('config_lang_en')}
              {lang === 'en' && <span className="ml-1 text-xs bg-[#1D9E75] text-white px-1.5 py-0.5 rounded-full">active</span>}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">{t('config_data_note')}</p>
        </div>
      </div>

      {/* VALORES PREDETERMINADOS */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-50">
          {t('config_section_defaults')}
        </h2>
        <Field label={t('config_default_currency')}>
          <select className={selectCls + ' max-w-xs'} value={config.defaultCurrency || 'USD'} onChange={set('defaultCurrency')}>
            {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">{t('config_default_currency_sub')}</p>
        </Field>
      </div>

      {/* INFORMACION DE EMPRESA */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-50">
          {t('config_section_company')}
        </h2>
        <div className="flex flex-col gap-4">
          <Field label={t('config_company_name')}>
            <input className={inputCls} value={config.companyName || ''} onChange={set('companyName')} placeholder={t('config_company_name_ph')} />
          </Field>
          <Field label={t('config_company_ruc')}>
            <input className={inputCls} value={config.companyRUC || ''} onChange={set('companyRUC')} placeholder={t('config_company_ruc_ph')} />
          </Field>
          <Field label={t('config_company_address')}>
            <input className={inputCls} value={config.companyAddress || ''} onChange={set('companyAddress')} placeholder={t('config_company_address_ph')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('config_company_phone')}>
              <input className={inputCls} value={config.companyPhone || ''} onChange={set('companyPhone')} placeholder={t('config_company_phone_ph')} />
            </Field>
            <Field label={t('config_company_email')}>
              <input className={inputCls} value={config.companyEmail || ''} onChange={set('companyEmail')} placeholder={t('config_company_email_ph')} />
            </Field>
          </div>
        </div>
      </div>

      {/* SAVE */}
      <div className="flex items-center gap-3">
        <PrimaryBtn onClick={save}>{t('config_save')}</PrimaryBtn>
        {saved && <span className="text-sm font-medium text-[#1D9E75]">{t('config_saved')}</span>}
      </div>
    </div>
  )
}
