function parseTaskLine(line) {
    const text = line.trim();

    if (!text) {
        return null;
    }

    let priority = null;
    let priorityNumber = null;
    let emphasized = false;
    let prefix = "";

    const priorityMatch = text.match(/^([A-D])(\d+)?(!)?-\s*/i);
    if (priorityMatch) {
        priority = priorityMatch[1].toUpperCase();
        priorityNumber = priorityMatch[2] ? Number(priorityMatch[2]) : null;
        emphasized = Boolean(priorityMatch[3]);
        prefix = priorityMatch[0];
    } else {
        const emphasisMatch = text.match(/^!\s*/);
        if (emphasisMatch) {
            emphasized = true;
            prefix = emphasisMatch[0];
        }
    }

    const estimateMatch = text.match(/\((\d+)\)\s*$/);
    const estimateMinutes = estimateMatch ? Number(estimateMatch[1]) : null;

    return {
        text,
        priority,
        priorityNumber,
        emphasized,
        prefix,
        body: text.slice(prefix.length),
        estimateMinutes,
    };
}

export { parseTaskLine };

export function parseTaskLines(rawText) {
    return rawText
        .split(/\r?\n/)
        .map(parseTaskLine)
        .filter(Boolean);
}
