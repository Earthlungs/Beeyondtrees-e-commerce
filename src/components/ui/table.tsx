import * as React from "react"

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full">{children}</table>
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr>{children}</tr>
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <th>{children}</th>
}

export function TableCell({ children }: { children: React.ReactNode }) {
  return <td>{children}</td>
}
