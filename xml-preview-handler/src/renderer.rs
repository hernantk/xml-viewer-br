/// GDI-based rendering for the preview pane.

#[cfg(target_os = "windows")]
mod inner {
    use windows::Win32::Foundation::{COLORREF, HWND, RECT};
    use windows::Win32::Graphics::Gdi::{
        BeginPaint, EndPaint, PAINTSTRUCT,
        CreateFontW, DeleteObject, SelectObject, HFONT, HGDIOBJ,
        SetBkMode, TRANSPARENT, SetTextColor,
        FillRect, DrawTextW,
        DT_LEFT, DT_RIGHT, DT_SINGLELINE, DT_WORDBREAK,
        CreateSolidBrush, HBRUSH, HDC,
        FW_BOLD, FW_NORMAL,
        DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, DEFAULT_QUALITY,
        VARIABLE_PITCH, FF_SWISS,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetClientRect;

    use crate::xml_info::{DocType, XmlPreviewInfo, format_chave};

    // COLORREF: low byte = R, mid = G, high = B
    const fn rgb(r: u8, g: u8, b: u8) -> COLORREF {
        COLORREF((r as u32) | ((g as u32) << 8) | ((b as u32) << 16))
    }

    const COLOR_NFE:   COLORREF = rgb(0,   110, 110);
    const COLOR_CTE:   COLORREF = rgb(176,  78,   0);
    const COLOR_NFSE:  COLORREF = rgb(26,  110,  46);
    const COLOR_WHITE: COLORREF = COLORREF(0x00FF_FFFF);
    const COLOR_BG:    COLORREF = rgb(250, 250, 250);
    const COLOR_LABEL: COLORREF = rgb(110, 110, 110);
    const COLOR_VALUE: COLORREF = rgb( 30,  30,  30);
    const COLOR_RED:   COLORREF = rgb(200,   0,   0);
    const COLOR_SEP:   COLORREF = rgb(220, 220, 220);

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    unsafe fn create_font_segoe(pts: i32, bold: bool) -> HFONT {
        let height = -(pts * 96 / 72);
        let weight = if bold { FW_BOLD.0 as i32 } else { FW_NORMAL.0 as i32 };
        let face = wide("Segoe UI");
        CreateFontW(
            height, 0, 0, 0, weight,
            0, 0, 0,
            DEFAULT_CHARSET,
            OUT_DEFAULT_PRECIS,
            CLIP_DEFAULT_PRECIS,
            DEFAULT_QUALITY,
            (VARIABLE_PITCH.0 | FF_SWISS.0) as u32,
            windows_core::PCWSTR(face.as_ptr()),
        )
    }

    unsafe fn create_font_mono(pts: i32) -> HFONT {
        let height = -(pts * 96 / 72);
        let face = wide("Consolas");
        CreateFontW(
            height, 0, 0, 0, FW_NORMAL.0 as i32,
            0, 0, 0,
            DEFAULT_CHARSET,
            OUT_DEFAULT_PRECIS,
            CLIP_DEFAULT_PRECIS,
            DEFAULT_QUALITY,
            0u32,
            windows_core::PCWSTR(face.as_ptr()),
        )
    }

    unsafe fn sel_font(hdc: HDC, font: HFONT) -> HGDIOBJ {
        SelectObject(hdc, HGDIOBJ(font.0))
    }

    unsafe fn draw_line(hdc: HDC, text: &str, rect: &mut RECT, color: COLORREF, font: HFONT, right: bool) {
        let mut w = wide(text);
        let _old = sel_font(hdc, font);
        SetTextColor(hdc, color);
        let fmt = if right { DT_RIGHT | DT_SINGLELINE } else { DT_LEFT | DT_SINGLELINE };
        let n = w.len() - 1; // exclude null terminator
        DrawTextW(hdc, &mut w[..n], rect as *mut RECT, fmt);
    }

    unsafe fn draw_wrap(hdc: HDC, text: &str, rect: &mut RECT, color: COLORREF, font: HFONT) {
        let mut w = wide(text);
        let _old = sel_font(hdc, font);
        SetTextColor(hdc, color);
        let n = w.len() - 1;
        DrawTextW(hdc, &mut w[..n], rect as *mut RECT, DT_LEFT | DT_WORDBREAK);
    }

    unsafe fn fill(hdc: HDC, rect: RECT, color: COLORREF) {
        let br: HBRUSH = CreateSolidBrush(color);
        let _ = FillRect(hdc, &rect, br);
        let _ = DeleteObject(HGDIOBJ(br.0));
    }

    // Main paint function — called from WM_PAINT in the preview WndProc
    pub unsafe fn paint(hwnd: HWND, info: &XmlPreviewInfo) {
        let mut ps = PAINTSTRUCT::default();
        let hdc = BeginPaint(hwnd, &mut ps);

        let mut client = RECT::default();
        let _ = GetClientRect(hwnd, &mut client);

        let fh  = create_font_segoe(16, true);  // header
        let ft  = create_font_segoe(10, true);  // label titles
        let fb  = create_font_segoe(11, false); // body
        let fv  = create_font_segoe(12, true);  // valor
        let fm  = create_font_mono(9);           // chave monospace

        fill(hdc, client, COLOR_BG);
        SetBkMode(hdc, TRANSPARENT);

        let pad = 10i32;
        let w = client.right;

        // --- Header ---
        let hc = match info.doc_type {
            DocType::Nfe    => COLOR_NFE,
            DocType::Cte    => COLOR_CTE,
            DocType::Nfse   => COLOR_NFSE,
            DocType::Unknown => rgb(80, 80, 80),
        };
        let hh = 52i32;
        fill(hdc, RECT { left: 0, top: 0, right: w, bottom: hh }, hc);

        let label = match info.doc_type {
            DocType::Nfe    => "NF-e  Nota Fiscal Eletronica",
            DocType::Cte    => "CT-e  Conhecimento de Transporte",
            DocType::Nfse   => "NFS-e  Nota Fiscal de Servicos",
            DocType::Unknown => "Documento XML",
        };
        let mut wl = wide(label);
        let _old = sel_font(hdc, fh);
        SetTextColor(hdc, COLOR_WHITE);
        let mut hlr = RECT { left: pad, top: (hh - 22) / 2, right: w - pad, bottom: hh };
        let wln = wl.len() - 1;
        DrawTextW(hdc, &mut wl[..wln], &mut hlr, DT_LEFT | DT_SINGLELINE);

        // --- Homologação banner ---
        let mut y = hh;
        if info.ambiente == "Homologação" {
            let bh = 22i32;
            fill(hdc, RECT { left: 0, top: y, right: w, bottom: y + bh }, COLOR_RED);
            let mut wb = wide("AMBIENTE DE HOMOLOGACAO");
            let _old = sel_font(hdc, ft);
            SetTextColor(hdc, COLOR_WHITE);
            let mut br = RECT { left: pad, top: y + 3, right: w - pad, bottom: y + bh };
            let wbn = wb.len() - 1;
            DrawTextW(hdc, &mut wb[..wbn], &mut br, DT_LEFT | DT_SINGLELINE);
            y += bh;
        }

        y += pad;
        let lh = 18i32; // line height
        let th = 14i32; // label height

        macro_rules! field {
            ($lbl:expr, $val:expr) => {
                if !$val.is_empty() {
                    let mut lr = RECT { left: pad, top: y, right: w - pad, bottom: y + th };
                    draw_line(hdc, $lbl, &mut lr, COLOR_LABEL, ft, false);
                    y += th;
                    let mut vr = RECT { left: pad, top: y, right: w - pad, bottom: y + lh };
                    draw_line(hdc, $val, &mut vr, COLOR_VALUE, fb, false);
                    y += lh + 4;
                }
            };
        }

        // Número / Série
        if !info.numero.is_empty() {
            let mut lr = RECT { left: pad, top: y, right: w - pad, bottom: y + th };
            draw_line(hdc, "Numero / Serie", &mut lr, COLOR_LABEL, ft, false);
            y += th;
            let ns = if info.serie.is_empty() {
                info.numero.clone()
            } else {
                format!("{} / {}", info.numero, info.serie)
            };
            let mut vr = RECT { left: pad, top: y, right: w - pad, bottom: y + lh };
            draw_line(hdc, &ns, &mut vr, COLOR_VALUE, fb, false);
            y += lh + 4;
        }

        field!("Data de Emissao", &info.data_emissao);

        sep(hdc, y, w, pad, COLOR_SEP);
        y += 6;

        field!("Emitente", &info.emitente_nome);
        field!("CNPJ Emitente", &info.emitente_cnpj);

        if !info.destinatario_nome.is_empty() {
            sep(hdc, y, w, pad, COLOR_SEP);
            y += 6;
        }
        field!("Destinatario / Tomador", &info.destinatario_nome);

        // Valor Total
        if !info.valor_total.is_empty() {
            sep(hdc, y, w, pad, COLOR_SEP);
            y += 6;
            let mut lr = RECT { left: pad, top: y, right: w - pad, bottom: y + th };
            draw_line(hdc, "Valor Total", &mut lr, COLOR_LABEL, ft, false);
            y += th;
            let mut vr = RECT { left: pad, top: y, right: w - pad, bottom: y + 22 };
            draw_line(hdc, &info.valor_total, &mut vr, hc, fv, true);
            y += 26;
        }

        // Chave de Acesso
        if !info.chave.is_empty() {
            sep(hdc, y, w, pad, COLOR_SEP);
            y += 6;
            let mut lr = RECT { left: pad, top: y, right: w - pad, bottom: y + th };
            draw_line(hdc, "Chave de Acesso", &mut lr, COLOR_LABEL, ft, false);
            y += th + 2;
            let cf = format_chave(&info.chave);
            let mut kr = RECT { left: pad, top: y, right: w - pad, bottom: y + 56 };
            draw_wrap(hdc, &cf, &mut kr, COLOR_VALUE, fm);
            y += 56;
        }

        field!("Protocolo de Autorizacao", &info.protocolo);
        let _ = y; // position tracking ends here

        let _ = DeleteObject(HGDIOBJ(fh.0));
        let _ = DeleteObject(HGDIOBJ(ft.0));
        let _ = DeleteObject(HGDIOBJ(fb.0));
        let _ = DeleteObject(HGDIOBJ(fv.0));
        let _ = DeleteObject(HGDIOBJ(fm.0));

        let _ = EndPaint(hwnd, &ps);
    }

    unsafe fn sep(hdc: HDC, y: i32, w: i32, pad: i32, color: COLORREF) {
        fill(hdc, RECT { left: pad, top: y, right: w - pad, bottom: y + 1 }, color);
    }
}

#[cfg(target_os = "windows")]
pub use inner::paint;

#[cfg(not(target_os = "windows"))]
pub fn paint(_hwnd: usize, _info: &crate::xml_info::XmlPreviewInfo) {}
