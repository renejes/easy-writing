import type { SpellLang } from './protocol';

import deAff from '../../../node_modules/dictionary-de/index.aff?url';
import deDic from '../../../node_modules/dictionary-de/index.dic?url';
import enUsAff from '../../../node_modules/dictionary-en/index.aff?url';
import enUsDic from '../../../node_modules/dictionary-en/index.dic?url';
import enGbAff from '../../../node_modules/dictionary-en-gb/index.aff?url';
import enGbDic from '../../../node_modules/dictionary-en-gb/index.dic?url';

export const dictUrls: Record<SpellLang, { aff: string; dic: string }> = {
	de: { aff: deAff, dic: deDic },
	'en-US': { aff: enUsAff, dic: enUsDic },
	'en-GB': { aff: enGbAff, dic: enGbDic },
};
