# Evernote Clearly Content Detection Algorithm

## Overview

Evernote Clearly uses a sophisticated multi-pass scoring algorithm to identify the main content of a web page and filter out irrelevant elements like navigation, ads, and boilerplate. The algorithm is implemented in `front/the_components/detect/detect.js` (approximately 2600 lines).

## Core Architecture

The detection system operates in several phases:
1. **DOM Exploration** - Traverse the entire document, collecting metrics
2. **Candidate Identification** - Identify potential content containers
3. **Multi-pass Scoring** - Score candidates using various heuristics
4. **Content Extraction** - Build clean HTML with cleanup filters

---

## Phase 1: Element Classification

### Ignored Elements (completely skipped)
```javascript
_elements_ignore: '|button|input|select|textarea|optgroup|command|datalist|
                   |frame|frameset|noframes|
                   |style|link|script|noscript|
                   |canvas|applet|map|
                   |marquee|area|base|'
```

### Ignored Tag Structure (tag removed, content kept)
```javascript
_elements_ignore_tag: '|form|fieldset|details|dir|center|font|'
```

### Container Elements (potential content candidates)
```javascript
_elements_container: '|body|article|section|div|td|li|dd|dt|'
```

### Self-closing Elements
```javascript
_elements_self_closing: '|br|hr|img|col|source|embed|param|'
```

### Hidden Element Detection
```javascript
$D.isNodeHidden = function (_node, _tag_name) {
    // SPANs are never considered hidden (inline)
    // Check offsetWidth/offsetHeight > 0
    // Check offsetLeft/offsetTop > 0
    // Exclude inline DIVs (no width/height by design)
}
```

---

## Phase 2: Ad and Spam Filtering

### Blocked Link Domains
Links from these domains are automatically skipped:
```javascript
_skip_link_from_domain: [
    'doubleclick.net', 'fastclick.net', 'adbrite.com', 'adbureau.net',
    'admob.com', 'bannersxchange.com', 'buysellads.com', 'impact-ad.jp',
    'atdmt.com', 'advertising.com', 'serving-sys.com',
    'itmedia.jp', 'microad.jp', 'adplan-ds.com'  // Japan-specific
]
```

### Blocked Image Domains
Images from these domains are automatically skipped:
```javascript
_skip_image_from_domain: [
    'googlesyndication.com', 'fastclick.net', '.2mdn.net', 'de17a.com',
    'content.aimatch.com', 'bannersxchange.com', 'buysellads.com',
    'atdmt.com', 'advertising.com', 'serving-sys.com',
    'impact-ad.jp', 'itmedia.jp', 'microad.jp', 'adplan-ds.com'
]
```

### Whitelisted Video Domains
Embeds are ONLY kept if from these domains:
```javascript
_keep_video_from_domain: [
    'youtube.com', 'youtube-nocookie.com', 'vimeo.com',
    'hulu.com', 'flickr.com', 'yahoo.com', 'newsnetz.ch'
]
```

---

## Phase 3: Metrics Collection

### Text Metrics
For each element, the algorithm collects:

| Metric | Description |
|--------|-------------|
| `_length__plain_text` | Character count of text NOT inside links |
| `_count__plain_words` | Word count of text NOT inside links |
| `_length__links_text` | Character count of text inside links |
| `_count__links_words` | Word count of text inside links |
| `_length__all_text` | Total character count |
| `_count__all_words` | Total word count |
| `_count__links` | Number of link elements |

### Image Classification by Size
```javascript
// Large: Primary content images (add points)
case ((_width * _height) >= 50000):
case ((_width >= 350) && (_height >= 75)):
    _result._is__image_large = true;

// Medium: Secondary images
case ((_width * _height) >= 20000):
case ((_width >= 150) && (_height >= 150)):
    _result._is__image_medium = true;

// Skip: Tracking pixels (penalize)
case ((_width <= 5) && (_height <= 5)):
    _result._is__image_skip = true;

// Small: Icons, etc.
default:
    _result._is__image_small = true;
```

### Position Tracking
```javascript
_length__above_plain_text   // Text before this element
_count__above_plain_words   // Words before this element
_count__above_candidates    // Candidate containers before this
_count__above_containers    // Container elements before this
```

---

## Phase 4: Candidate Scoring (Three-Pass System)

### First Pass: Base Score Calculation
```javascript
// Initial points based on paragraph metrics
_points = (
    (_count__paragraphs_of_3_lines)        +  // lines/65/3
    (_count__paragraphs_of_5_lines * 1.5)  +  // lines/65/5
    (_count__paragraphs_of_50_words)       +  // words/50
    (_count__paragraphs_of_80_words * 1.5) +  // words/80
    (_count__images_large * 3)             -  // Large images boost score
    ((_count__images_skip + _count__images_small) * 0.5)  // Small images reduce
) * 1000;
```

### Scoring Factors Applied (all passes)

#### 1. Text Ratio to Total
Higher ratio of page text = more likely to be content
```javascript
_ratio__length__plain_text_to_total_plain_text
_ratio__count__plain_words_to_total_plain_words
```

#### 2. Link Density (KEY FILTER)
High link density = likely navigation, not content
```javascript
_ratio__length__links_text_to_plain_text  // Link text vs plain text
_ratio__count__links_words_to_plain_words // Link words vs plain words
_ratio__count__links_to_plain_words       // Links per word
```

**CJK Exception**: Different thresholds for Chinese/Japanese/Korean content (more tolerance)

#### 3. Position in Document
Content appearing after lots of text = less likely to be main content
```javascript
_ratio__length__above_plain_text_to_total_plain_text
_ratio__count__above_plain_words_to_total_plain_words
```

#### 4. Container/Candidate Ratios
```javascript
_ratio__count__candidates_to_total_candidates
_ratio__count__containers_to_total_containers
_ratio__count__pieces_to_total_pieces
```

### Multi-Pass Refinement

1. **First Pass**: Score all containers against the entire `<body>`
2. **Second Pass**: Re-score children of the top candidate (more precise)
3. **Third Pass**: Final comparison between first and second place candidates

### Winner Selection Logic
```javascript
switch (true) {
    // Short content: second must beat first
    case (lines < 20) && (second_points / first_points > 1):
    // Medium content: second must be within 90%
    case (lines > 20) && (second_points / first_points > 0.9):
    // Long content: second must be within 75%
    case (lines > 50) && (second_points / first_points > 0.75):
        _targetCandidate = _secondCandidate;
}
```

---

## Phase 5: Content Cleanup (Building Clean HTML)

### Pre-Build Filtering ("clean-before")

#### 1. Embed/iframe Filtering
Only keep embeds from whitelisted video domains:
```javascript
case ('object'):
case ('embed'):
case ('iframe'):
    var _src = /* get source */;
    var _skip = true;
    for (var i=0; i < _keep_video_from_domain.length; i++) {
        if (_src.indexOf(_keep_video_from_domain[i]) > -1) {
            _skip = false;
            break;
        }
    }
    if (_skip) return;  // Don't include
```

#### 2. Ad Link Filtering
Skip links with small images and short text:
```javascript
if (_tag_name == 'a' || _tag_name == 'li') {
    if (_explored._is__link_skip) return;
    if ((_count__images_small + _count__images_skip > 0) &&
        (_length__plain_text < 65)) return;
}
```

#### 3. Link Density Filter
Remove navigation-heavy sections:
```javascript
if (_elements_link_density.indexOf(_tag_name) > -1) {
    // Keep if: >390 characters of plain text
    // Keep if: only 1 link with short text
    // Keep if: has large/medium images with little text
    // Otherwise: check link ratio
    if ((_length__links_text / _length__all_text) >= 0.5) return;
}
```

#### 4. Floating Element Filter
Remove floated sidebars/ads:
```javascript
if (_float == 'left' || _float == 'right') {
    // Keep if: >390 characters
    // Keep if: >25% of total content
    // Keep if: has large images with no link text
    // Otherwise: remove floating element
}
```

#### 5. Header-Only-Image Filter
Remove headers that are just images:
```javascript
if (_tag_name.match(/^h(1|2|3|4|5|6)$/)) {
    if ((_length__plain_text < 10) && (has_any_images)) return;
}
```

### Post-Build Filtering ("clean-after")

#### 1. Skip Image Removal
```javascript
if (_tag_name == 'img' && _explored._is__image_skip) {
    // Remove tracking pixels and tiny images
    _global__the_html = _global__the_html.substr(0, _pos__start__before);
}
```

#### 2. "Too Much Content" Filter
Headers/bold text with excessive content get their tags removed:
```javascript
case (_tag_name == 'h1' && _length > 130):   // 65*2
case (_tag_name == 'h2' && _length > 390):   // 65*2*3
case (_tag_name.match(/h3|h4|h5|h6/) && _length > 650):  // 65*2*5
case (_tag_name.match(/b|i|em|strong/) && _length > 1625):
    // Remove tag, keep content
```

#### 3. Empty Element Removal
```javascript
if (_contentsLength == 0 && _tag_name == 'p') {
    // Replace with <br /><br />
}
if (_contentsLength == 0 || (_contentsLength < 5 && is_visible)) {
    // Remove entirely
}
```

#### 4. Missing Content Density Filter
Detect when too much was stripped from an element:
```javascript
if (_contentsLength / _initialLength < 0.5) {
    // If >50% of element content was filtered out,
    // probably means it was mostly junk - remove whole element
}
```

### HTML Post-Processing (Regex Cleanup)
```javascript
// Remove empty span tags
_html = _html.replace(/<(\/)?span([^>]*?)>/gi, '');

// Clean up excessive line breaks
_html = _html.replace(/<(div|p|td|li)>(\s*<br \/>)+/gi, '<$1>');
_html = _html.replace(/(<br \/>\s*)+<\/(div|p|td|li)>/gi, '</$1>');

// Collapse multiple breaks/rules
_html = _html.replace(/(<hr \/>\s*<hr \/>\s*)+/gi, '<hr />');
_html = _html.replace(/(<br \/>\s*<br \/>\s*)+/gi, '<br /><br />');
```

---

## Special Handling

### Language Detection (CJK)
```javascript
$D.detectLanguage = function () {
    // Sample text from title, paragraphs, spans, divs
    // Check for CJK punctuation marks:
    // \u3000 (ideographic space)
    // \u3001 (ideographic comma)
    // \u3002 (ideographic full stop)
    // \u301C (wave dash)
    if (text.match(/[\u3000\u3001\u3002\u301C]/gi)) {
        $D.language = 'cjk';
    }
}
```

CJK content uses more lenient thresholds because:
- Shorter word counts (words are characters)
- Different link density expectations

### RTL Detection
```javascript
// Check html/body for dir="rtl" or direction: rtl
// Also check lang="he", "he-il", "ar", "ur"
```

### Site-Specific Quirks
```javascript
// Wikipedia: Remove "[edit]" links from headers
if ($D.domainNameIs__wikipedia && is_header) {
    _html = _html.replace(/<a([^>]+?)>edit<\/a>/gi, '');
}

// WSJ: Remove stock ticker widgets
if ($D.domainNameIs__wsj && is_article_chiclet) {
    // Extract just the link text
}
```

---

## Key Insights for Web Clipper Implementation

### Most Important Filters

1. **Link Density** - The single most effective filter. Navigation menus have high link-to-text ratios. Content has low ratios.

2. **Ad Domain Blocking** - Maintaining a blocklist of ad networks eliminates most tracking/ad images and links.

3. **Video Whitelisting** - Instead of trying to filter bad embeds, only allow known good video sources.

4. **Image Size Classification** - Large images (>50000px²) are likely content. Tiny images (≤5x5) are tracking pixels.

5. **Empty Element Removal** - Aggressively remove elements with no/minimal content after filtering.

### Algorithm Flow Summary

```
DOM Exploration
     │
     ▼
Collect Metrics (text, links, images, position)
     │
     ▼
Identify Candidates (containers with enough text, low link ratio)
     │
     ▼
Three-Pass Scoring
     │
     ├─► First Pass: Score against body
     │        │
     │        ▼
     ├─► Second Pass: Score within winner's children
     │        │
     │        ▼
     └─► Third Pass: Final comparison
            │
            ▼
       Select Winner
            │
            ▼
Build HTML with Cleanup Filters
     │
     ├─► Pre-build: Skip ads, high-link-density, floating, embeds
     │
     ├─► Build: Whitelist attributes, convert relative URLs
     │
     └─► Post-build: Remove empty, too-much-content, missing-density
            │
            ▼
Regex Post-Processing (cleanup markup)
            │
            ▼
       Clean HTML Output
```

---

## Attributes Preserved

Only specific attributes are kept per element type:
```javascript
_elements_keep_attributes: {
    'a':        ['href', 'title', 'name'],
    'img':      ['src', 'width', 'height', 'alt', 'title'],
    'video':    ['src', 'width', 'height', 'poster', 'audio', 'preload',
                 'autoplay', 'loop', 'controls'],
    'audio':    ['src', 'preload', 'autoplay', 'loop', 'controls'],
    'source':   ['src', 'type'],
    'object':   ['data', 'type', 'width', 'height', 'classid',
                 'codebase', 'codetype'],
    'param':    ['name', 'value'],
    'embed':    ['src', 'type', 'width', 'height', 'flashvars',
                 'allowscriptaccess', 'allowfullscreen', 'bgcolor'],
    'iframe':   ['src', 'width', 'height', 'frameborder', 'scrolling'],
    'td':       ['colspan', 'rowspan'],
    'th':       ['colspan', 'rowspan']
}
```

All other attributes (classes, styles, data-*, event handlers) are stripped.

---

## References

- Source: https://github.com/tunglam14/evernote-clearly
- Main detection file: `front/the_components/detect/detect.js`
- Reformatting component: `front/the_components/reformat/reformat.js`
- Original Evernote Clearly was discontinued in 2015
