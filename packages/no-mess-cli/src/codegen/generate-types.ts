import type { ContentTypeDefinition } from "@no-mess/client/schema";
import { generateDefinitionContracts } from "@no-mess/client/schema";

export function generateTypesSource(
  definitions: ContentTypeDefinition[],
): string {
  const orderedDefinitions = [
    ...definitions.filter((definition) => definition.kind === "fragment"),
    ...definitions.filter((definition) => definition.kind === "template"),
  ];
  const contracts = generateDefinitionContracts(orderedDefinitions);
  const lines = [
    'import type { NoMessEntry, ShopifyCollectionRef, ShopifyProductRef } from "@no-mess/client";',
    "",
  ];

  for (const contract of contracts) {
    lines.push(contract.interfaceSource);
    lines.push("");
  }

  for (const contract of contracts) {
    if (contract.slugConstName) {
      lines.push(
        `export const ${contract.slugConstName} = ${JSON.stringify(contract.definition.slug)} as const;`,
      );
      if (contract.routeConstName && contract.definition.kind === "template") {
        lines.push(
          `export const ${contract.routeConstName} = ${JSON.stringify(contract.definition.route)} as const;`,
        );
      }
      lines.push("");
    }
  }

  for (const contract of contracts) {
    lines.push(`export const ${contract.fieldMapConstName} = {`);
    for (const [key, value] of Object.entries(contract.fieldPathMap)) {
      lines.push(`  ${key}: ${JSON.stringify(value)},`);
    }
    lines.push("} as const;");
    lines.push(
      `export type ${contract.fieldPathTypeName} = (typeof ${contract.fieldMapConstName})[keyof typeof ${contract.fieldMapConstName}];`,
    );
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
