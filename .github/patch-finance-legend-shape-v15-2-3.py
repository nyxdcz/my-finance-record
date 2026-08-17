from pathlib import Path
import base64

ICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAEVQTFRFAAAA3+/v4+fu4+ft4+ju4ufs4+bt3+fs5Oft4uft5+fv4+fs4+bs59/v5Ojt5Ofv4+bt5OTv5OTq4ufs4ubt3+Tv4+jsMCIv+AAAABd0Uk5TABC//89g/2Cf/yD//yCPn+8wMP//MK9rXdHQAAABiklEQVR4nK2WUXODIAyAQVa03ebV7v//we1ha3tWh8UWUFBJELxrnjySjyQkQSjZLPRlCKWU0PsWZKeWJSFZl4zkdn+UwZBd7z4xBkEmgkmMmSHFpOUC7NNC5EBb34wxQfaN2U3pDlcfYQtjCeMlds0iZW0MucCsORHK0cd5iRyv0HIwn9KSS2QPEoYxegiDxkBQBE3baSBSdEHACG8AEnYRDExXLii6mEukumBd4snYb9QRceH3ziGn8/HPuE5iaLIPF5tGUspIhhMg/UMjb49kJ0TfITTZiREupEbe43nPmEYj2ZbrbwjMRBbrFltnufWQCzEecjqT2VJqJtpgjpi35XpIrdeWCcUpWmTE1vrSTCwcsWg6PhLPv6iBl6iAwKrfoK2OQGXqIfqCjc2lh5Q1FyODZaXX7C/GdTGP3WI2+9kv6d8pl11tneY3H1GxZV0gGS4++6mjkPGqLsaNTozJ0w/QYxOpYrSxlcjJo0Ns8+L0hmjxuR+ZHCOCLyX1CPj6xlWve1ytyRMuvYMzfn/h6gAAAABJRU5ErkJggg=="

asset_path = Path("icons/finance-legend-shape-v15-2-3.png")
asset_path.parent.mkdir(parents=True, exist_ok=True)
asset_path.write_bytes(base64.b64decode(ICON_BASE64))

css_path = Path("ui-icon-alignment-v15-0-5.css")
css = css_path.read_text()
marker = "/* V15.2.3 · Finance legend markers use the supplied scalloped silhouette. */"
rule = r'''

/* V15.2.3 · Finance legend markers use the supplied scalloped silhouette. */
html body #money .legend > .legend-item .legend-dot {
  border-radius:0 !important;
  -webkit-mask-image:url("./icons/finance-legend-shape-v15-2-3.png");
  mask-image:url("./icons/finance-legend-shape-v15-2-3.png");
  -webkit-mask-repeat:no-repeat;
  mask-repeat:no-repeat;
  -webkit-mask-position:center;
  mask-position:center;
  -webkit-mask-size:contain;
  mask-size:contain;
}
'''
if marker not in css:
    css += rule
css_path.write_text(css)
