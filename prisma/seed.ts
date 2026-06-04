import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = ["กาแฟ", "ชา", "นม", "โกโก้", "โซดา", "ขนม"];

const menuItems = [
  ["อเมริกาโน่", "กาแฟ", 45],
  ["เอสเปรสโซ่", "กาแฟ", 50],
  ["ลาเต้", "กาแฟ", 55],
  ["คาปูชิโน่", "กาแฟ", 55],
  ["มอคค่า", "กาแฟ", 60],
  ["ชาไทย", "ชา", 45],
  ["ชาเขียว", "ชา", 45],
  ["โกโก้", "โกโก้", 45],
  ["นมสด", "นม", 40],
  ["แดงโซดา", "โซดา", 40],
  ["ครัวซองต์", "ขนม", 65],
  ["เค้ก", "ขนม", 75],
] as const;

const modifierGroups = [
  {
    name: "ประเภทเครื่องดื่ม",
    type: "SINGLE" as const,
    isRequired: true,
    options: [
      ["ร้อน", 0],
      ["เย็น", 5],
      ["ปั่น", 15],
    ],
  },
  {
    name: "ขนาด",
    type: "SINGLE" as const,
    isRequired: true,
    options: [
      ["ปกติ", 0],
      ["ใหญ่", 10],
    ],
  },
  {
    name: "ความหวาน",
    type: "SINGLE" as const,
    isRequired: true,
    options: [
      ["0%", 0],
      ["25%", 0],
      ["50%", 0],
      ["75%", 0],
      ["100%", 0],
    ],
  },
  {
    name: "เพิ่มเติม",
    type: "MULTIPLE" as const,
    isRequired: false,
    options: [
      ["เพิ่มช็อต", 15],
      ["เพิ่มวิป", 10],
      ["นมโอ๊ต", 20],
      ["คาราเมล", 10],
    ],
  },
] satisfies {
  name: string;
  type: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  options: [string, number][];
}[];

async function main() {
  await prisma.shopSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      shopName: "Coffee POS",
      address: "ตั้งค่าที่อยู่ร้านในหน้าตั้งค่า",
      phone: "",
      promptPayId: "0812345678",
      receiptFooter: "ขอบคุณที่อุดหนุน",
    },
  });

  const categoryMap = new Map<string, string>();
  for (const [index, name] of categories.entries()) {
    const category = await prisma.category.upsert({
      where: { name },
      update: { sortOrder: index, isActive: true },
      create: { name, sortOrder: index },
    });
    categoryMap.set(name, category.id);
  }

  const groupIds: string[] = [];
  for (const [index, group] of modifierGroups.entries()) {
    const savedGroup = await prisma.modifierGroup.upsert({
      where: { name: group.name },
      update: { type: group.type, isRequired: group.isRequired, sortOrder: index },
      create: { name: group.name, type: group.type, isRequired: group.isRequired, sortOrder: index },
    });
    groupIds.push(savedGroup.id);

    for (const [optionIndex, [optionName, priceDelta]] of group.options.entries()) {
      await prisma.modifierOption.upsert({
        where: { name_modifierGroupId: { name: optionName, modifierGroupId: savedGroup.id } },
        update: { priceDelta, sortOrder: optionIndex },
        create: { name: optionName, priceDelta, sortOrder: optionIndex, modifierGroupId: savedGroup.id },
      });
    }
  }

  for (const [itemName, categoryName, price] of menuItems) {
    const categoryId = categoryMap.get(categoryName);
    if (!categoryId) throw new Error(`Missing category: ${categoryName}`);

    const item = await prisma.menuItem.upsert({
      where: { name_categoryId: { name: itemName, categoryId } },
      update: { price, isActive: true },
      create: { name: itemName, price, categoryId },
    });

    if (categoryName !== "ขนม") {
      for (const [sortOrder, modifierGroupId] of groupIds.entries()) {
        await prisma.menuItemModifierGroup.upsert({
          where: { menuItemId_modifierGroupId: { menuItemId: item.id, modifierGroupId } },
          update: { sortOrder },
          create: { menuItemId: item.id, modifierGroupId, sortOrder },
        });
      }
    }
  }

  console.log("✅ Seed complete");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
