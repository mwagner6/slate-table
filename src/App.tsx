import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { BaseEditor, Descendant, createEditor, Element as SlateElement, Transforms } from "slate";
import { ReactEditor, Editable, Slate, withReact, RenderElementProps } from "slate-react";
import "./index.css";

// Define custom types for the elements
type ParagraphElement = {
    type: 'paragraph';
    children: { text: string }[];
};

type CodeElement = {
    type: 'code';
    children: { text: string }[];
}

type TableElement = {
    type: 'table';
    children: TableColumnElement[];
}

type TableColumnElement = {
    type: 'table-col';
    children: TableCellElement[];
}

type TableCellElement = {
    type: 'table-cell';
    children: { text: string }[];
}

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor;
        Element: ParagraphElement | CodeElement | TableElement | TableColumnElement | TableCellElement;
        Text: { text: string };
    }
}

let r = 2;
let c = 2;

// Function to extract table values and calculate sums
const extractTableValuesAndSum = (nodes: Descendant[]) => {
    const sums: number[] = [];
    const tempnode = nodes[0];
    if (!(SlateElement.isElement(tempnode) && tempnode.type === 'table')) {
        return sums;
    }
    for (const col of tempnode.children) {
        if (col.type !== 'table-col') {
            continue;
        }
        for (const cell of col.children) {
            let colSum = 0; 
            if (cell.type !== 'table-cell') {
                continue;
            }
            const cellText = cell.children[0].text;
            const cellValue = parseFloat(cellText);
            if (!isNaN(cellValue)) {
                colSum += cellValue;
            }
            sums.push(colSum);
        }
    }
    return sums;
};

// Custom element renderer
const CustomElement = ({ attributes, children, element }: RenderElementProps) => {
    switch (element.type) {
        case 'code':
            return <pre {...attributes} className="code">{children}</pre>;
        case 'table':
            return (
                <table {...attributes} style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <tbody>{children}</tbody>
                </table>
            );
        case 'table-col':
            return <tr {...attributes}>{children}</tr>;
        case 'table-cell':
            return (
                <td {...attributes} style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>
                    {children}
                </td>
            );
        default:
            return <p {...attributes}>{children}</p>;
    }
};


// Main App component
export const App = () => {
    const editor = useMemo(() => withReact(createEditor()), []);

    const initialValue: Descendant[] = [
        {
            type: 'table',
            children: [
                {
                    type: 'table-col',
                    children: [
                        { type: 'table-cell', children: [{ text: 'Col 1, Cell 1' }] },
                        { type: 'table-cell', children: [{ text: 'Col 1, Cell 2' }] },
                    ],
                },
                {
                    type: 'table-col',
                    children: [
                        { type: 'table-cell', children: [{ text: 'Col 2, Cell 1' }] },
                        { type: 'table-cell', children: [{ text: 'Col 2, Cell 2' }] },
                    ],
                },
            ],
        },
    ];

    const [value, setValue] = useState<Descendant[]>(initialValue);
    const [sums, setSums] = useState<number[]>([]);

    // Handle editor changes
    const handleChange = useCallback((newValue: Descendant[]) => {
        console.log('Editor changed:', newValue); // For debugging
        setValue(newValue);
        const calculatedSums = extractTableValuesAndSum(newValue);
        setSums(calculatedSums);
    }, []);

    // Add a new column to the table
    const addColumn = () => {
        c += 1;
        Transforms.insertNodes(
            editor,
            {
                type: 'table-col',
                children: Array(r).fill({
                    type: 'table-cell',
                    children: [{ text: '' }]
                })
            },
            { at: [0, c-1] }
        );
    }

    const delColumn = () => {
        c -= 1
        Transforms.removeNodes(
            editor,
            { at: [0, c] }
        )
    }

    const addRow = () => {
        r += 1;
        if (SlateElement.isElement(editor.children[0]) && editor.children[0].type == 'table') {
            for (let child = 0; child < editor.children[0].children.length; child++) {
                Transforms.insertNodes(
                    editor,
                    {
                        type: 'table-cell',
                        children: [{
                            text: ''
                        }]
                    },
                    { at: [...[0, child], r-1]}
                )
            }
        }
    }

    const delRow = () => {
        r -= 1;
        if (SlateElement.isElement(editor.children[0]) && editor.children[0].type == 'table') {
            for (let child = 0; child < editor.children[0].children.length; child++) {
                Transforms.removeNodes(
                    editor,
                    { at: [...[0, child], r-1]}
                )
            }
        }
    }

    return (
        <div>
            <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
                <Editable 
                    onKeyDown={(event) => {
                        if (!event.ctrlKey) {
                            if (event.key == 'Enter') {
                                event.preventDefault()
                            }
                            if (!event.shiftKey) {
                                return
                            } else {
                                switch (event.key) {
                                    case 'Enter': {
                                        event.preventDefault()
                                        addColumn()
                                        break
                                    }
                                    case 'Backspace': {
                                        event.preventDefault()
                                        delColumn()
                                        break
                                    }
                                }
                            }
                        } else {
                            switch (event.key) {
                                case 'Enter': {
                                    event.preventDefault()
                                    addRow()
                                    break
                                }

                                case 'Backspace': {
                                    event.preventDefault()
                                    delRow()
                                    break
                                }
                            }
                        }
                    }}
                    renderElement={props => <CustomElement {...props} />}
                />
            </Slate>
            <p>Use Shift + Enter/Delete to Add/Remove Columns, and Control + Enter/Delete to Add/Remove Rows</p>
            <div>
                <h3>Sums of Rows:</h3>
                {sums.map((sum, index) => (
                    <div key={index}>Sum of col {index + 1}: {sum}</div>
                ))}
            </div>
        </div>
    );
};
