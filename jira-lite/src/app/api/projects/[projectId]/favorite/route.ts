/**
 * Project Favorite API Route
 * 
 * POST /api/projects/[projectId]/favorite - Toggle favorite status
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;

    // Check project access
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!project || project.deletedAt || !project.team.members.length) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existingFavorite = await db.favoriteProject.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId,
        },
      },
    });

    if (existingFavorite) {
      // Remove favorite
      await db.favoriteProject.delete({
        where: { id: existingFavorite.id },
      });
      return NextResponse.json({ isFavorite: false });
    } else {
      // Add favorite
      await db.favoriteProject.create({
        data: {
          userId: session.user.id,
          projectId,
        },
      });
      return NextResponse.json({ isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
