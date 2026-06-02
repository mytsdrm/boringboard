// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useRef} from 'react'
import {IconDotsVertical, IconFileSpreadsheet, IconFileTypePdf, IconPrinter} from '@tabler/icons-react'
import {FormattedMessage, useIntl} from 'react-intl'

import './tableModule.scss'

type Props = {
    children: React.ReactNode
    className?: string
    fileName?: string
    printTitle: string
    toolbarLeft?: React.ReactNode
}

const createPrintDocument = (title: string, tableHtml: string) => `<!doctype html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>${title}</title>
    <style>
        body { color: #1f2937; font-family: Arial, sans-serif; margin: 24px; }
        h1 { font-size: 20px; margin: 0 0 18px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #d0d5dd; font-size: 12px; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f3f6fb; color: #475467; font-weight: 700; text-transform: uppercase; }
        .btn, button, svg, .icon, .admin-table-actions { display: none !important; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${tableHtml}
</body>
</html>`

const getTableHtml = (element: HTMLElement | null): string => {
    return element?.querySelector('table')?.outerHTML || ''
}

const TableModule = (props: Props): JSX.Element => {
    const intl = useIntl()
    const contentRef = useRef<HTMLDivElement>(null)
    const optionsRef = useRef<HTMLDetailsElement>(null)
    const fileName = props.fileName || props.printTitle.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '')

    const closeOptions = () => {
        if (optionsRef.current) {
            optionsRef.current.open = false
        }
    }

    const printTable = () => {
        const tableHtml = getTableHtml(contentRef.current)
        if (!tableHtml) {
            return
        }

        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            return
        }

        printWindow.document.write(createPrintDocument(props.printTitle, tableHtml))
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        closeOptions()
    }

    const exportExcel = () => {
        const tableHtml = getTableHtml(contentRef.current)
        if (!tableHtml) {
            return
        }

        const blob = new Blob([createPrintDocument(props.printTitle, tableHtml)], {
            type: 'application/vnd.ms-excel;charset=utf-8',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName}.xls`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        closeOptions()
    }

    return (
        <section className={`card TableModule ${props.className || ''}`}>
            <div className='table-module-toolbar'>
                <div className='table-module-toolbar-left'>
                    {props.toolbarLeft}
                </div>
                <details
                    ref={optionsRef}
                    className='table-module-options'
                >
                    <summary
                        aria-label={intl.formatMessage({
                            id: 'TableModule.options',
                            defaultMessage: 'Options',
                        })}
                        className='btn btn-outline-secondary table-module-options-button'
                    >
                        <IconDotsVertical
                            className='icon'
                            size={18}
                        />
                        <FormattedMessage
                            id='TableModule.options'
                            defaultMessage='Options'
                        />
                    </summary>
                    <div className='table-module-options-menu'>
                        <button
                            type='button'
                            onClick={exportExcel}
                        >
                            <IconFileSpreadsheet size={17}/>
                            <FormattedMessage
                                id='TableModule.print-excel'
                                defaultMessage='Print Excel'
                            />
                        </button>
                        <button
                            type='button'
                            onClick={printTable}
                        >
                            <IconFileTypePdf size={17}/>
                            <FormattedMessage
                                id='TableModule.print-pdf'
                                defaultMessage='Print PDF'
                            />
                        </button>
                        <button
                            type='button'
                            onClick={printTable}
                        >
                            <IconPrinter size={17}/>
                            <FormattedMessage
                                id='TableModule.print-web'
                                defaultMessage='Print Web'
                            />
                        </button>
                    </div>
                </details>
            </div>
            <div
                ref={contentRef}
                className='table-module-content'
            >
                {props.children}
            </div>
        </section>
    )
}

export default React.memo(TableModule)
