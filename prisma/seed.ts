import { PrismaClient, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean up existing seed data
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({ where: { email: "test@example.com" } });

  const hashedPassword = await bcrypt.hash("password123", 12);

  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Q2 project to redesign the company website",
      ownerId: user.id,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Design homepage mockups",
        description: "Create wireframes and high-fidelity designs for the new homepage",
        status: TaskStatus.todo,
        priority: TaskPriority.high,
        projectId: project.id,
        assigneeId: user.id,
        dueDate: new Date("2026-05-01"),
      },
      {
        title: "Set up CI/CD pipeline",
        description: "Configure GitHub Actions for automated testing and deployment",
        status: TaskStatus.in_progress,
        priority: TaskPriority.medium,
        projectId: project.id,
        assigneeId: user.id,
        dueDate: new Date("2026-04-20"),
      },
      {
        title: "Write API documentation",
        description: "Document all REST endpoints with request/response examples",
        status: TaskStatus.done,
        priority: TaskPriority.low,
        projectId: project.id,
        assigneeId: user.id,
      },
    ],
  });

  console.log("✅ Seed complete — test@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
