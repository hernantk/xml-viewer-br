
#[cfg(test)]
mod real_file_tests {
    use super::*;

    #[test]
    fn parse_real_cte() {
        let xml = std::fs::read_to_string(r"c:\Users\herna\Downloads\cte.xml").expect("cte.xml not found");
        match parse_document(&xml) {
            Ok(doc) => {
                assert_eq!(doc.document_type, DocumentType::Cte);
                let cte = doc.cte.unwrap();
                println!("CT-e nCT={}", cte.inf_cte.ide.n_ct);
            }
            Err(e) => panic!("CT-e parse failed: {e}"),
        }
    }

    #[test]
    fn parse_real_nfse() {
        let xml = std::fs::read_to_string(r"c:\Users\herna\Downloads\nfs-e.xml").expect("nfs-e.xml not found");
        match parse_document(&xml) {
            Ok(doc) => {
                assert_eq!(doc.document_type, DocumentType::Nfse);
                let nfse = doc.nfse.unwrap();
                println!("NFS-e numero={}", nfse.nfse.inf_nfse.numero);
            }
            Err(e) => panic!("NFS-e parse failed: {e}"),
        }
    }
}
