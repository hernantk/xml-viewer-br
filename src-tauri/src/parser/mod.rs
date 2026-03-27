pub mod detector;
pub mod nfe_parser;
pub mod cte_parser;
pub mod nfse_parser;

/// Helper to get text content of a child element by local name
pub fn get_text<'a>(node: &'a roxmltree::Node, name: &str) -> String {
    node.children()
        .find(|n| n.has_tag_name(name))
        .and_then(|n| n.text())
        .unwrap_or("")
        .to_string()
}

/// Helper to get optional text content
pub fn get_text_opt(node: &roxmltree::Node, name: &str) -> Option<String> {
    node.children()
        .find(|n| n.has_tag_name(name))
        .and_then(|n| n.text())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
}

/// Helper to find a child element by local name
pub fn find_child<'a>(node: &'a roxmltree::Node<'a, 'a>, name: &str) -> Option<roxmltree::Node<'a, 'a>> {
    node.children().find(|n| n.has_tag_name(name))
}

/// Helper to find all children with a given tag name
pub fn find_children<'a>(node: &'a roxmltree::Node<'a, 'a>, name: &str) -> Vec<roxmltree::Node<'a, 'a>> {
    node.children().filter(|n| n.has_tag_name(name)).collect()
}
