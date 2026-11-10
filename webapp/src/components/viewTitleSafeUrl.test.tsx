// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toSafeExternalUrl} from './viewTitle'

describe('components/viewTitle toSafeExternalUrl', () => {
    test('keeps http and https links', () => {
        expect(toSafeExternalUrl('https://github.com/org/repo')).toBe('https://github.com/org/repo')
        expect(toSafeExternalUrl(' http://localhost:3000/app ')).toBe('http://localhost:3000/app')
    })

    test('adds https to links without a scheme', () => {
        expect(toSafeExternalUrl('github.com/org/repo')).toBe('https://github.com/org/repo')
        expect(toSafeExternalUrl('localhost:3000')).toBe('https://localhost:3000/')
    })

    test('rejects script and other non-web links', () => {
        /* eslint-disable no-script-url */
        expect(toSafeExternalUrl('javascript:alert(1)')).toBeNull()
        expect(toSafeExternalUrl('JavaScript:alert(document.cookie)')).toBeNull()
        /* eslint-enable no-script-url */
        expect(toSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
        expect(toSafeExternalUrl('ftp://example.com/file')).toBeNull()
        expect(toSafeExternalUrl('')).toBeNull()
    })
})
