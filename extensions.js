/**
 *	Title: MarkUp Parser Extensions
 *	Author: LostAbaddon
 *	Email: LostAbaddon@gmail.com
 *	Version: 1.1.0
 *	Date: 2021.03.27
 */

const generateRandomKey = MarkUp.generateRandomKey;

// LaTeX
MarkUp.addExtension({
	name: 'LaTeX',
	parse: (line, doc, caches) => {
		caches[MarkUp.SymHidden] = caches[MarkUp.SymHidden] || {};
		var changed = false;
		line = line.replace(/(\\+)\$/g, (match, slash) => {
			var len = Math.floor(slash.length / 2);
			var result = '';
			var meta = '%' + MarkUp.PreserveWords['\\'] + '%';
			for (let i = 0; i < len; i ++) result += meta
			if (len * 2 !== slash.length) {
				let word = MarkUp.PreserveWords['$'];
				result += '%' + word + '%';
			} else {
				result += '$';
			}
			changed = true;
			return result;
		});
		line = line.replace(/\$([\w\W]+?)\$/g, (match, content) => {
			if (match.indexOf('$$') >= 0) return match;
			var key = 'latex-' + generateRandomKey();
			caches[MarkUp.SymHidden][key] = '<span class="latex inline">$' + content + '$</span>';
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, -1);

// FA 图标
MarkUp.addExtension({
	name: 'FontAwesome',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/:([\w\-\.]+?):/g, (match, name, pos) => {
			name = name.trim();
			changed = true;
			return '<i class="fas far fa-' + name + '"></i>'
		});
		return [line, changed];
	},
}, 0, 3);
// 超链接
MarkUp.addExtension({
	name: 'HyperLinks',
	parse: (line, doc, caches) => {
		doc.links = doc.links || [];
		var changed = false;
		line = line.replace(/([!@#]?)\[([\w %'"\*_\^\|~\-\.\+=·,;:\?!\\\/&\u0800-\uffff]*?)\] *\((\@?[\w\W]*?)\)/g, (match, prev, title, link, pos) => {
			link = link.trim();
			if (link.length === 0) return match;
			if (!!caches[title]) return match;

			if (prev === '') {
				doc.links.push([title, link]);
				let first = link.substr(0, 1);
				let isInner = first === '@';
				let content = MarkUp.parseLine(title, doc, 3, caches);
				let key = 'link-' + generateRandomKey();
				let ui = '<a href="';
				if (isInner) {
					ui = ui + '#' + link.substr(1, link.length) + '">';
				}
				else if (link.indexOf('@') > 1) {
					ui = ui + 'mailto:' + link + '">';
				}
				else if (first === '.' || first === '\\' || first === '/' || first === '#') {
					ui = ui + link + '">';
				}
				else {
					ui = ui + link + '" target="_blank">';
				}
				ui = ui + content + '</a>';
				caches[key] = ui;
				changed = true;
				return '%' + key + '%';
			}
			return match;
		});
		return [line, changed];
	},
}, 0, 3);
// 锚点与术语
MarkUp.addExtension({
	name: 'AnchorAndTerm',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/\[([\w %'"\-\.\+=,;:\?!\\\/&\u0800-\uffff]*?)\] *\{([\w \-\.]+?)\}/g, (match, title, name, pos) => {
			name = name.trim();
			title = title.trim();
			if (name.length === 0) return match;
			if (title.length === 0) return match;
			if (!!caches[title]) return match;

			var key;
			title = MarkUp.parseLine(title, doc, 3, caches);

			if (!!doc.refs[name]) {
				// 有定义，所以是术语
				key = 'term-' + generateRandomKey();
				doc.termList = doc.termList || [];
				doc.termList.push([name, title]);
				doc.termList[name] = title;
				let ui = '<a class="terminology" name="' + name + '" href="#ref-' + name + '"><strong>' + title + '</strong></a>';
				caches[key] = ui;
			}
			else {
				// 无定义，所以只是一个锚点
				key = 'anchor-' + generateRandomKey();
				let ui = '<a name="' + name + '">' + title + '</a>';
				caches[key] = ui;
			}
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, 3);

// Code
MarkUp.addExtension({
	name: 'Code',
	parse: (line, doc, caches) => {
		caches[MarkUp.SymHidden] = caches[MarkUp.SymHidden] || {};
		var changed = false;
		line = line.replace(/`([\w\W]+?)`/g, (match, content) => {
			if (match.indexOf('``') >= 0) return match;
			var key = 'code-' + generateRandomKey();
			caches[MarkUp.SymHidden][key] = '<code>' + content + '</code>';
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
});
// 粗体与斜体
MarkUp.addExtension({
	name: 'BoldAndItalic',
	parse: (line, doc, caches) => {
		var locs = [];
		line.replace(/\*+/g, (match, pos) => {
			locs.push([pos, match.length]);
		});
		if (locs.length < 2) return [line, false];

		var generate = (start, end, isBold) => {
			var part = line.substring(start, end + (isBold ? 2 : 1));
			var inner;
			if (isBold) inner = part.substring(2, part.length - 2);
			else inner = part.substring(1, part.length - 1);
			var key = (isBold ? 'strong' : 'em') + '-' + generateRandomKey();
			inner = MarkUp.parseLine(inner, doc, 5, caches);
			if (isBold) {
				caches[key] = '<strong>' + inner + '</strong>';
			}
			else {
				caches[key] = '<em>' + inner + '</em>';
			}
			key = '%' + key + '%';
			line = line.replace(part, key);
		};

		var first = locs[0][1], second = locs[1][1];
		if (first < 3) {
			// 如果开头非联合
			if (first === second) {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
			else if (second < 3) {
				let third = locs[2];
				if (!third) {
					if (first > second) {
						generate(locs[0][0] + 1, locs[1][0], false);
						return [line, true];
					}
					else {
						generate(locs[0][0], locs[1][0], false);
						return [line, true];
					}
				} else {
					third = third[1];
					if (third < 3) {
						if (second === third) {
							generate(locs[1][0], locs[2][0], second === 2);
							return [line, true];
						}
						else if (first === third) {
							generate(locs[0][0], locs[2][0], first === 2);
							return [line, true];
						}
						else {
							return [line, false];
						}
					}
					else {
						generate(locs[1][0], locs[2][0], second === 2);
						return [line, true];
					}
				}
			}
			else {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
		} else {
			// 开头联合
			if (second < 3) {
				if (second === 1) {
					generate(locs[0][0] + first - 1, locs[1][0], false);
					return [line, true];
				} else {
					generate(locs[0][0] + first - 2, locs[1][0], true);
					return [line, true];
				}
			}
			else {
				generate(locs[0][0], locs[1][0] + second - 2, true);
				return [line, true];
			}
		}
		return [line, false];
	},
});
// 下标与下划线
MarkUp.addExtension({
	name: 'SubAndUnderline',
	parse: (line, doc, caches) => {
		var locs = [];
		line.replace(/_+/g, (match, pos) => {
			locs.push([pos, match.length]);
		});
		if (locs.length < 2) return [line, false];

		var generate = (start, end, isUnder) => {
			var part = line.substring(start, end + (isUnder ? 2 : 1));
			var inner;
			if (isUnder) inner = part.substring(2, part.length - 2);
			else inner = part.substring(1, part.length - 1);
			var key = (isUnder ? 'underline' : 'sub') + '-' + generateRandomKey();
			inner = MarkUp.parseLine(inner, doc, 5, caches);
			if (isUnder) {
				caches[key] = '<u>' + inner + '</u>';
			}
			else {
				caches[key] = '<sub>' + inner + '</sub>';
			}
			key = '%' + key + '%';
			line = line.replace(part, key);
		};

		var first = locs[0][1], second = locs[1][1];
		if (first < 3) {
			// 如果开头非联合
			if (first === second) {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
			else if (second < 3) {
				let third = locs[2];
				if (!third) {
					if (first > second) {
						generate(locs[0][0] + 1, locs[1][0], false);
						return [line, true];
					}
					else {
						generate(locs[0][0], locs[1][0], false);
						return [line, true];
					}
				} else {
					third = third[1];
					if (third < 3) {
						if (second === third) {
							generate(locs[1][0], locs[2][0], second === 2);
							return [line, true];
						}
						else if (first === third) {
							generate(locs[0][0], locs[2][0], first === 2);
							return [line, true];
						}
						else {
							return [line, false];
						}
					}
					else {
						generate(locs[1][0], locs[2][0], second === 2);
						return [line, true];
					}
				}
			}
			else {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
		} else {
			// 开头联合
			if (second < 3) {
				if (second === 1) {
					generate(locs[0][0] + first - 1, locs[1][0], false);
					return [line, true];
				} else {
					generate(locs[0][0] + first - 2, locs[1][0], true);
					return [line, true];
				}
			}
			else {
				generate(locs[0][0], locs[1][0] + second - 2, true);
				return [line, true];
			}
		}
		return [line, false];
	},
});
// 波浪线与删除线
MarkUp.addExtension({
	name: 'WavyAndDelete',
	parse: (line, doc, caches) => {
		var locs = [];
		line.replace(/~+/g, (match, pos) => {
			locs.push([pos, match.length]);
		});
		if (locs.length < 2) return [line, false];

		var generate = (start, end, isDelete) => {
			var part = line.substring(start, end + (isDelete ? 2 : 1));
			var inner;
			if (isDelete) inner = part.substring(2, part.length - 2);
			else inner = part.substring(1, part.length - 1);
			var key = (isDelete ? 'delete' : 'wavy') + '-' + generateRandomKey();
			inner = MarkUp.parseLine(inner, doc, 5, caches);
			if (isDelete) {
				caches[key] = '<del>' + inner + '</del>';
			}
			else {
				caches[key] = '<span class="text-wavy">' + inner + '</span>';
			}
			key = '%' + key + '%';
			line = line.replace(part, key);
		};

		var first = locs[0][1], second = locs[1][1];
		if (first < 3) {
			// 如果开头非联合
			if (first === second) {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
			else if (second < 3) {
				let third = locs[2];
				if (!third) {
					if (first > second) {
						generate(locs[0][0] + 1, locs[1][0], false);
						return [line, true];
					}
					else {
						generate(locs[0][0], locs[1][0], false);
						return [line, true];
					}
				} else {
					third = third[1];
					if (third < 3) {
						if (second === third) {
							generate(locs[1][0], locs[2][0], second === 2);
							return [line, true];
						}
						else if (first === third) {
							generate(locs[0][0], locs[2][0], first === 2);
							return [line, true];
						}
						else {
							return [line, false];
						}
					}
					else {
						generate(locs[1][0], locs[2][0], second === 2);
						return [line, true];
					}
				}
			}
			else {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
		} else {
			// 开头联合
			if (second < 3) {
				if (second === 1) {
					generate(locs[0][0] + first - 1, locs[1][0], false);
					return [line, true];
				} else {
					generate(locs[0][0] + first - 2, locs[1][0], true);
					return [line, true];
				}
			}
			else {
				generate(locs[0][0], locs[1][0] + second - 2, true);
				return [line, true];
			}
		}
		return [line, false];
	},
});
// 上标与更大
MarkUp.addExtension({
	name: 'SupAndLarger',
	parse: (line, doc, caches) => {
		var generate = (start, end, level) => {
			var part = line.substring(start, end + level);
			var inner = part.substring(level, part.length - level);
			var key = 'larger-' + level + '-' + generateRandomKey();
			inner = MarkUp.parseLine(inner, doc, 5, caches);
			if (level <= 1) {
				caches[key] = '<sup>' + inner + '</sup>';
			}
			else {
				caches[key] = '<span class="text-larger level-' + (level - 1) + '">' + inner + '</span>';
			}
			key = '%' + key + '%';
			line = line.replace(part, key);
		};

		var changed = false;
		line.replace(/(\^+)([\w\W]+?)(\^+)/, (match, pre, content, post, pos) => {
			var checker = content.match(/(\\*)\[/);
			if (!!checker) {
				let len = checker[1].length;
				if (len >> 1 << 1 === len) return match;
			}
			pre = pre.length;
			post = post.length;
			if (pre > post) {
				generate(pos + pre - post, pos + match.length - post, post);
			}
			else {
				generate(pos, pos + match.length - post, pre);
			}
			changed = true;
			return match;
		});
		return [line, changed];
	},
});

// 颜色
MarkUp.addExtension({
	name: 'Color',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/\[(\w+)\]([\w\W]+?)\[\/\]/, (match, color, content, pos) => {
			if (content.length === 0) return match;

			content = MarkUp.parseLine(content, doc, 5, caches);
			var key = 'color-' + generateRandomKey();
			caches[key] = '<span class="color-' + color + '">' + content + '</span>';
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, 6);
// 脚注与尾注
MarkUp.addExtension({
	name: 'FootnoteAndEndnote',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/(\[([\w %'"\-\.\+=,;:\?!\\\/&\u0800-\uffff]*?)\])?\[([\^:])([\w \-\.]+?)\]/g, (match, all, title='', prefix, name) => {
			name = name.trim();
			if (name.length === 0) return match;
			if (!doc.refs[name]) return match;

			var ui = '<a class="notemark" type="';
			if (prefix === '^') {
				ui += 'endnote" href="#endnote-' + name
			}
			else {
				ui += 'footnote'
			}
			ui += '" name="' + name + '">';
			if (title) {
				ui = ui + MarkUp.parseLine(title, doc, 6, caches);
			}
			ui += '<sup>'
			if (prefix === '^') { // 尾注
				doc.endnotes = doc.endnotes || [];
				let i = doc.endnotes.indexOf(name);
				if (i < 0) {
					i = doc.endnotes.length;
					doc.endnotes.push(name);
				}
				i ++;
				ui += '(' + i + ')';
			}
			else { // 脚注
				doc.footnotes = doc.footnotes || [];
				let i = doc.footnotes.indexOf(name);
				if (i < 0) {
					i = doc.footnotes.length;
					doc.footnotes.push(name);
				}
				ui += '[%%FN-' + i + '%%]';
			}
			ui += '</sup></a>';
			var key = 'notemark-' + generateRandomKey();
			caches[key] = ui;
			return '%' + key + '%'
		});
		return [line, changed];
	},
}, 0, 6);

// 图片等资源
MarkUp.addExtension({
	name: 'Images',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/([!@#])\[([^\n]*?)\] *\((\@?[\w\W]*?)\)/g, (match, prev, title, link, pos) => {
			link = link.trim();
			if (link.length === 0) return match;

			var float = link.match(/[ 　\t]+"(left|right)"/);
			if (!!float) {
				link = link.replace(float[0], '');
				float = float[1];
			}

			var type = 'image';
			if (prev === '@') type = 'video';
			else if (prev === '#') type = 'audio';
			doc[type] = doc[type] || [];
			doc[type].push([title, link]);

			var content = '<div class="resource ' + type;
			if (!!float) {
				content += ' float-' + float;
			}
			content += '">';
			content += '<figure>';
			if (prev === '!') {
				content += '<img src="' + link + '">';
			}
			else if (prev === '@') {
				content += '<video src="' + link + '" controls>你的浏览器不支持 <code>video</code> 标签.</video>';
			}
			else if (prev === '#') {
				content += '<audio src="' + link + '" controls>你的浏览器不支持 <code>audio</code> 标签.</audio>';
			}
			content += '</figure>';
			content += '<figcaption>' + title + '</figcaption>';
			content += '</div>';

			var key = type + '-' + generateRandomKey();
			caches[key] = content;
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, 7);

// URL 格式解析
MarkUp.addExtension({
	name: 'InlineLinks',
	parse: (line, doc, caches) => {
		var changed = false;
		if (!doc.mainParser) return [line, changed];

		line = line.replace(/https?:\/\/[\w\-\+=\.;\?\\\/%]+/gi, (match, pos) => {
			doc.links.push([match, match]);
			var ui = '<a href="' + match + '" target="_blank">' + match + '</a>';
			var key = 'link-' + generateRandomKey();
			caches[key] = ui;
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, 8);

// 表格图示
MarkUp.addExtension({
	name: 'Chart',
	parse: (line, doc, caches) => {
		var changed = false;
		line = line.replace(/^[ 　\t]*CHART\((.*?)\):(.*?):(.*?)(:(.*?))?[ 　\t]*$/, (match, table, style, title, nouse, lines) => {
			var name = 'CHART-' + MarkUp.generateRandomKey();
			doc.charts = doc.charts || {};
			line = line || '';
			doc.charts[name] = { table, style, title, lines };
			changed = true;
			return '[%' + name + '%]';
		});
		return [line, changed];
	},
}, 0, -1);
MarkUp.addExtension({
	name: 'Chart',
	parse: (text, doc) => {
		text = text.replace(/<[pP]>\[%(CHART-.*?)%\]<\/[pP]>/g, (match, id) => {
			var { table, title, style, lines } = doc.charts[id];
			var chartMaker = generateChart[style];
			if (!chartMaker) {
				return '<font color="red">所选图表样式（' + style + '）不存在！</font>';
			}
			table = doc.tables[table];
			lines = getDatum(table, lines);

			var svg = '<div class="table-chart"><svg width="' + SVGDefaultSize + '" height="' + SVGDefaultSize + '" viewbox=" 0 0 ' + SVGDefaultSize + ' ' + SVGDefaultSize + '">';
			svg += chartMaker(lines, title);
			svg += '</svg></div>';
			return svg;
		});
		return text;
	},
}, 2, -1);

// 寻找图表元素
const SVGDefaultSize = 600;
const SVGLineColors = [
	'rgb(21, 85, 154)',
	'rgb(18, 161, 130)',
	'rgb(210, 177, 22)',
	'rgb(255, 153, 0)',
	'rgb(242, 107, 31)',
	'rgb(244, 62, 6)',
	'rgb(149, 28, 72)',
	'rgb(126, 32, 101)',
	'rgb(86, 152, 195)',
	'rgb(41, 183, 203)',
	'rgb(131, 203, 172)',
	'rgb(150, 194, 78)',
	'rgb(210, 217, 122)',
	'rgb(183, 174, 143)',
	'rgb(193, 101, 26)',
	'rgb(100, 72, 61)',
	'rgb(189, 174, 173)',
	'rgb(227, 180, 184)',
	'rgb(215, 196, 187)',
	'rgb(190, 194, 63)',
	'rgb(110, 117, 164)',
	'rgb(46, 169, 223)'
];
const SVGDefaultFillOpacity = 0.4;
const getDatum = (table, lines) => {
	var last = '', isRow = true;
	// 全部列
	if (!lines) {
		isRow = false;
		let count = table[0].length;
		lines = [];
		for (let i = 1; i < count; i ++) {
			lines.push([0, i]);
		}
	}
	// 全部行
	else if (lines === 'reverse') {
		isRow = true;
		let count = table.length;
		lines = [];
		for (let i = 1; i < count; i ++) {
			lines.push([0, i]);
		}
	}
	else {
		lines = lines.split(',');
		lines = lines.map(pair => {
			pair = pair.split('-');
			if (pair.length >= 2) {
				last = pair[0];
				let n = last * 1;
				if (isNaN(n)) {
					isRow = true;
					n = parseInt(last.split('').map(n => MarkUp.Char2Dig[n.toLowerCase()] || n).join(''), 26);
					last = n;
				}
				else {
					isRow = false;
					last = n;
				}
				pair[0] = last;
				pair.splice(2, pair.length - 2);
			}
			else if (pair.length === 1) {
				pair[1] = pair[0];
				pair[0] = last;
			}
			return pair;
		}).filter(pair => pair.length === 2);
		lines.forEach(pair => {
			var n = pair[1];
			var m = n * 1;
			if (isNaN(m)) {
				m = parseInt(n.split('').map(n => MarkUp.Char2Dig[n.toLowerCase()] || n).join(''), 26);
			}
			pair[1] = m;
		});
	}

	var datum = [];
	if (isRow) {
		lines.forEach(([main, value]) => {
			var count = table.length;
			var dataLine = [];
			for (let i = 0; i < count; i ++) {
				let v = table[i][value] * 1;
				if (Number.is(v)) dataLine.push([table[i][main], v]);
			}
			if (dataLine.length > 0) datum.push(dataLine);
		});
	}
	else {
		lines.forEach(([main, value]) => {
			main = table[main];
			value = table[value];
			if (!main || !value) return;
			var count = main.length;
			var dataLine = [];
			for (let i = 0; i < count; i ++) {
				let v = value[i] * 1;
				if (Number.is(v)) dataLine.push([main[i], v]);
			}
			if (dataLine.length > 0) datum.push(dataLine);
		});
	}

	return datum;
};
// 生成图表
const generateChart = {
	_drawText (x, y, text, color='black', bold=false) {
		var svg = '<text x="' + x + '" y="' + y + '"'
		if (!!color) svg += ' fill="' + color + '"'
		if (!!bold) svg += ' font-weight="bold"'
		svg += '>' + text + '</text>';
		return svg;
	},
	_drawLine (x1, y1, x2, y2, w, color="black") {
		var svg = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"';
		if (!!color && !!w) svg += ' stroke="' + color + '" stroke-width="' + w + '"';
		svg += ' />';
		return svg;
	},
	_drawRect (x, y, w, h, fill, stroke, s) {
		var svg = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"';
		if (!!fill) svg += ' fill="' + fill + '"';
		if (!!stroke && !!s) svg += ' stroke="' + stroke + '" stroke-width="' + s + '"'
		svg += ' />';
		return svg;
	},
	_drawCircle (x, y, r, fill, stroke, s) {
		var svg = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"';
		if (!!fill) svg += ' fill="' + fill + '"';
		if (!!stroke && !!s) svg += ' stroke="' + stroke + '" stroke-width="' + s + '"'
		svg += ' />';
		return svg;
	},
	_drawPolygon (points, fill, stroke, s) {
		points = points.map(p => p.join(',')).join(' ');
		var svg = '<polygon points="' + points + '"';
		if (!!fill) svg += ' fill="' + fill + '"';
		if (!!stroke && !!s) svg += ' stroke="' + stroke + '" stroke-width="' + s + '"'
		svg += ' />';
		return svg;
	},
	_background (lines, title, isNum, fromZero=false, noLine=false) {
		var xmin = Infinity, xmax = 0, ymin = Infinity, ymax = 0, sets = [], xstep, ystep;
		if (isNum) {
			lines.forEach(line => {
				line.forEach(pair => {
					var x = pair[0] * 1;
					if (isNaN(x)) x = 0;
					pair[0] = x;
					if (x > xmax) xmax = x;
					if (x < xmin) xmin = x;
					if (!sets.includes(x)) sets.push(x);
				});
			});
			sets.sort((a, b) => a - b);
		}
		else {
			lines.forEach(line => {
				line.forEach(pair => {
					var x = pair[0];
					if (!sets.includes(x)) sets.push(x);
				});
			});
			xmin = 0;
			xmax = sets.length;
		}
		var xfrom = xmin, xto = xmax;
		if (xmin === xmax) {
			xmin -= 0.5;
			xmax += 0.5;
			xstep = 0.1;
		}
		else {
			let delta = xmax - xmin;
			delta *= 0.05;
			xmin -= delta;
			xmax += delta;
			xstep = delta / 5;
		}

		lines.forEach(line => {
			line.forEach(pair => {
				var y = pair[1];
				if (y > ymax) ymax = y;
				if (y < ymin) ymin = y;
			});
		});
		if (fromZero) {
			if (ymin > 0) ymin = 0;
			if (ymax < 0) ymax = 0;
		}
		var yfrom = ymin, yto = ymax;
		if (ymin === ymax) {
			ymin -= 0.5;
			ymax += 0.5;
			ystep = 0.1;
		}
		else {
			delta = ymax - ymin;
			delta *= 0.05;
			ymin -= delta;
			ymax += delta;
			ystep = delta / 5;
		}

		var svg = [generateChart._drawRect(0, 0, SVGDefaultSize, SVGDefaultSize, 'white')];
		svg.push(generateChart._drawText(SVGDefaultSize / 2 - title.length * 16 / 2, 16 + 1, title, 'black', true));

		if (noLine) {
			return [svg.join(''), { xmin, xmax, ymin, ymax, xfrom, xto, yfrom, yto, sets }];
		}

		svg.push(generateChart._drawLine(
			((xfrom - xmin) / (xmax - xmin) * SVGDefaultSize), ((ymax - yfrom) / (ymax - ymin) * SVGDefaultSize),
			((xto - xmin) / (xmax - xmin) * SVGDefaultSize), ((ymax - yfrom) / (ymax - ymin) * SVGDefaultSize),
			1
		));
		svg.push(generateChart._drawLine(
			((xfrom - xmin) / (xmax - xmin) * SVGDefaultSize), ((ymax - yfrom) / (ymax - ymin) * SVGDefaultSize),
			((xfrom - xmin) / (xmax - xmin) * SVGDefaultSize), ((ymax - yto) / (ymax - ymin) * SVGDefaultSize),
			1
		));
		if (isNum) {
			sets.forEach(point => {
				svg.push(generateChart._drawLine(
					((point - xmin) / (xmax - xmin) * SVGDefaultSize), ((ymax - yfrom) / (ymax - ymin) * SVGDefaultSize),
					((point - xmin) / (xmax - xmin) * SVGDefaultSize), ((ymax - yfrom + ystep) / (ymax - ymin) * SVGDefaultSize),
					1
				));
				var tag = point + '';
				var offsetX = tag.length * 8 / 2;
				svg.push(generateChart._drawText(
					((point - xmin) / (xmax - xmin) * SVGDefaultSize - offsetX),
					((ymax - yfrom + ystep * 1.5) / (ymax - ymin) * SVGDefaultSize + 16),
					point)
				);
			});
		}
		else {
			let step = (xto - xfrom) / (sets.length + 1);
			sets.forEach((tag, i) => {
				var x = ((i + 1) * step - xmin) / (xmax - xmin) * SVGDefaultSize;
				svg.push(generateChart._drawLine(
					x, ((ymax - yfrom) / (ymax - ymin) * SVGDefaultSize),
					x, ((ymax - yfrom + ystep) / (ymax - ymin) * SVGDefaultSize),
					1
				));
				var offset = tag.length * 8 / SVGDefaultSize / 2 * SVGDefaultSize;
				svg.push(generateChart._drawText(
					(x - offset),
					((ymax - yfrom + ystep * 1.5) / (ymax - ymin) * SVGDefaultSize + 16),
					tag)
				);
			});
		}

		return [svg.join(''), { xmin, xmax, ymin, ymax, xfrom, xto, yfrom, yto, sets }];
	},
	points (lines, title) {
		var [svg, range] = generateChart._background(lines, title, true);
		svg = [svg];
		lines.forEach((line, c) => {
			c -= Math.floor(c / SVGLineColors.length) * SVGLineColors.length;
			c = SVGLineColors[c];
			line.forEach(point => {
				svg.push(generateChart._drawCircle(
					((point[0] - range.xmin) / (range.xmax - range.xmin) * SVGDefaultSize),
					((range.ymax - point[1]) / (range.ymax - range.ymin) * SVGDefaultSize),
					2.5, c
				));
			});
		});
		return svg.join('');
	},
	lines (lines, title) {
		var [svg, range] = generateChart._background(lines, title, true);
		svg = [svg];
		lines.forEach((line, c) => {
			c -= Math.floor(c / SVGLineColors.length) * SVGLineColors.length;
			c = SVGLineColors[c];
			line.sort((pa, pb) => pa[0] - pb[0]);
			var lastX = 0, lastY = 0;
			line.forEach((point, i) => {
				var x = ((point[0] - range.xmin) / (range.xmax - range.xmin) * SVGDefaultSize);
				var y = ((range.ymax - point[1]) / (range.ymax - range.ymin) * SVGDefaultSize);
				svg.push(generateChart._drawCircle(x, y, 2.5, c));
				if (i > 0) svg.push(generateChart._drawLine(lastX, lastY, x, y, 1, c));
				lastX = x;
				lastY = y;
			});
		});
		return svg.join('');
	},
	area (lines, title) {
		var [svg, range] = generateChart._background(lines, title, true);
		svg = [svg];
		lines.forEach((line, c) => {
			c -= Math.floor(c / SVGLineColors.length) * SVGLineColors.length;
			c = SVGLineColors[c];
			line.sort((pa, pb) => pa[0] - pb[0]);
			var pointList = [];
			pointList.push([
				((range.xto - range.xmin) / (range.xmax - range.xmin) * SVGDefaultSize),
				((range.ymax - range.yfrom) / (range.ymax - range.ymin) * SVGDefaultSize)
			]);
			pointList.push([
				((range.xfrom - range.xmin) / (range.xmax - range.xmin) * SVGDefaultSize),
				((range.ymax - range.yfrom) / (range.ymax - range.ymin) * SVGDefaultSize)
			]);
			line.forEach((point, i) => {
				var x = ((point[0] - range.xmin) / (range.xmax - range.xmin) * SVGDefaultSize);
				var y = ((range.ymax - point[1]) / (range.ymax - range.ymin) * SVGDefaultSize);
				svg.push(generateChart._drawCircle(x, y, 2.5, c));
				pointList.push([x, y]);
			});
			var fill = c.replace(/rgb/i, 'rgba').replace(')', ',' + SVGDefaultFillOpacity + ')');
			svg.push(generateChart._drawPolygon(pointList, fill, c, 1));
		});
		return svg.join('');
	},
	pie (lines, title) {
		var [svg, range] = generateChart._background(lines, title, false, false, true);
		var max = 0;
		lines.forEach(line => {
			var total = 0;
			line.forEach(point => {
				if (point[1] <= 0) return;
				total += point[1];
			});
			if (total > max) max = total;
		});

		var radius = SVGDefaultSize / 2 * 0.9;
		var count = lines.length + (lines.length - 1) * 0.1, lastR = 0, stepR = radius / count;
		svg = [svg];
		lines.forEach((line, i) => {
			var r = (i + 1 + i * 0.1) * stepR;
			var lastXOut = SVGDefaultSize / 2 - r, lastYOut = SVGDefaultSize / 2;
			var lastXIn = SVGDefaultSize / 2 - lastR, lastYIn = SVGDefaultSize / 2;
			var total = 0;
			line.forEach((point, j) => {
				if (point[1] <= 0) return;
				var color = j - Math.floor(j / SVGLineColors.length) * SVGLineColors.length;
				color = SVGLineColors[color];
				total += point[1];
				var flag = (point[1] * 2 > max) ? 1 : 0;
				var angle = total / max * Math.PI * 2;
				var sin = Math.sin(angle), cos = Math.cos(angle);
				var xOut = SVGDefaultSize / 2 - cos * r, yOut = SVGDefaultSize / 2 - sin * r;
				var xIn = SVGDefaultSize / 2 - cos * lastR, yIn = SVGDefaultSize / 2 - sin * lastR;
				svg.push('<path fill="' + color + '" d="M '
					+ lastXIn + ' ' + lastYIn
					+ ' L ' + lastXOut + ' ' + lastYOut
					+ ' A ' + r + ' ' + r + ' 0 ' + flag + ' 1 ' + xOut + ' ' + yOut
					+ ' L ' + xIn + ' ' + yIn
					+ ' A ' + lastR + ' ' + lastR + ' 0 ' + flag + ' 0 ' + lastXIn + ' ' + lastYIn
					+ ' Z" />');
				lastXOut = xOut;
				lastYOut = yOut;
				lastXIn = xIn;
				lastYIn = yIn;
			});
			lastR = r + 0.1 * stepR;
		});

		return svg;
	},
	column (lines, title) {
		var [svg, range] = generateChart._background(lines, title, false, true);
		svg = [svg];
		var step = (range.xto - range.xfrom) / (range.sets.length + 1);
		var delta = step / (lines.length + 2) / (range.xmax - range.xmin) * SVGDefaultSize, span = delta * lines.length / 2;
		var y0 = (range.ymax - range.yfrom) / (range.ymax - range.ymin) * SVGDefaultSize;
		lines.forEach((line, j) => {
			var c = j - Math.floor(j / SVGLineColors.length) * SVGLineColors.length;
			c = SVGLineColors[c];
			var move = delta * j - span;
			line.forEach((point, i) => {
				var j = range.sets.indexOf(point[0]);
				if (j < 0) return;

				var x = ((j + 1) * step - range.xmin) / (range.xmax - range.xmin) * SVGDefaultSize + move;
				var y = (range.ymax - point[1]) / (range.ymax - range.ymin) * SVGDefaultSize;
				svg.push(generateChart._drawRect(x, y, delta, y0 - y, c));
			});
		});
		return svg.join('');
	},
};