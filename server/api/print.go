package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/gorilla/mux"
	"github.com/jung-kurt/gofpdf"
	"github.com/mattermost/focalboard/server/model"
)

type tablePDFRequest struct {
	FileName string     `json:"fileName"`
	Headers  []string   `json:"headers"`
	Rows     [][]string `json:"rows"`
	Title    string     `json:"title"`
}

func (a *API) registerPrintRoutes(r *mux.Router) {
	r.HandleFunc("/print/pdf", a.sessionRequired(a.handlePrintPDF)).Methods(http.MethodPost)
}

func (a *API) handlePrintPDF(w http.ResponseWriter, r *http.Request) {
	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	var request tablePDFRequest
	if err = json.Unmarshal(requestBody, &request); err != nil {
		a.errorResponse(w, r, err)
		return
	}

	if len(request.Headers) == 0 {
		a.errorResponse(w, r, model.NewErrBadRequest("table headers are required"))
		return
	}

	pdfBytes, err := createTablePDF(request)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	fileName := sanitizePDFFileName(request.FileName)
	setResponseHeader(w, "Content-Type", "application/pdf")
	setResponseHeader(w, "Content-Disposition", `attachment; filename="`+fileName+`.pdf"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdfBytes)
}

func createTablePDF(request tablePDFRequest) ([]byte, error) {
	title := strings.TrimSpace(request.Title)
	if title == "" {
		title = "Table export"
	}

	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(12, 12, 12)
	pdf.SetAutoPageBreak(true, 12)
	pdf.AddPage()
	pdf.SetTitle(title, true)
	pdf.SetFont("Helvetica", "B", 16)
	pdf.CellFormat(0, 9, title, "", 1, "L", false, 0, "")
	pdf.Ln(3)

	pageWidth, pageHeight := pdf.GetPageSize()
	leftMargin, _, rightMargin, _ := pdf.GetMargins()
	tableWidth := pageWidth - leftMargin - rightMargin
	columnWidth := tableWidth / float64(len(request.Headers))
	rowHeight := 8.0

	writeHeader := func() {
		pdf.SetFillColor(243, 246, 251)
		pdf.SetTextColor(71, 84, 103)
		pdf.SetDrawColor(208, 213, 221)
		pdf.SetFont("Helvetica", "B", 9)
		for _, header := range request.Headers {
			pdf.CellFormat(columnWidth, rowHeight, cleanPDFText(header), "1", 0, "L", true, 0, "")
		}
		pdf.Ln(rowHeight)
	}

	writeHeader()
	pdf.SetTextColor(31, 41, 55)
	pdf.SetFont("Helvetica", "", 8)
	for _, row := range request.Rows {
		if pdf.GetY()+rowHeight > pageHeight-12 {
			pdf.AddPage()
			writeHeader()
			pdf.SetTextColor(31, 41, 55)
			pdf.SetFont("Helvetica", "", 8)
		}

		for index := range request.Headers {
			value := ""
			if index < len(row) {
				value = row[index]
			}
			pdf.CellFormat(columnWidth, rowHeight, cleanPDFText(value), "1", 0, "L", false, 0, "")
		}
		pdf.Ln(rowHeight)
	}

	var buffer bytes.Buffer
	if err := pdf.Output(&buffer); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func cleanPDFText(value string) string {
	cleaned := strings.Map(func(r rune) rune {
		if r > 255 {
			return '?'
		}
		return r
	}, value)
	return strings.Join(strings.Fields(cleaned), " ")
}

func sanitizePDFFileName(value string) string {
	fileName := strings.TrimSpace(value)
	if fileName == "" {
		fileName = "table-export"
	}

	fileName = regexp.MustCompile(`[^a-zA-Z0-9_-]+`).ReplaceAllString(fileName, "-")
	fileName = strings.Trim(fileName, "-")
	if fileName == "" {
		return "table-export"
	}
	return fileName
}
