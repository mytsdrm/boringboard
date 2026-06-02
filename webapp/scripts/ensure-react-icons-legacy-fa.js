// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');
const path = require('path');

const legacyFaEntry = path.resolve(__dirname, '../node_modules/react-icons/fa/index.esm.js');
const legacyFaContent = "export * from './index.mjs';\n";

fs.mkdirSync(path.dirname(legacyFaEntry), {recursive: true});

if (!fs.existsSync(legacyFaEntry) || fs.readFileSync(legacyFaEntry, 'utf8') !== legacyFaContent) {
    fs.writeFileSync(legacyFaEntry, legacyFaContent);
}
