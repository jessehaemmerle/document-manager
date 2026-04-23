import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/auth-user.decorator';
import { RoleCode } from '../common/enums/app.enums';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReviewActionDto } from './dto/review-action.dto';
import { ReviewsService } from './reviews.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get('assignments/mine')
  myAssignments(@CurrentUser() user: AuthUser, @Query() query: AssignmentQueryDto) {
    return this.service.myAssignments(user, query);
  }

  @Get('assignments')
  @Roles(RoleCode.ADMIN, RoleCode.MANAGER)
  allAssignments(@CurrentUser() user: AuthUser, @Query() query: AssignmentQueryDto) {
    return this.service.allAssignments(user, query);
  }

  @Post('assignments/:id/action')
  submitAction(@Param('id') id: string, @Body() dto: ReviewActionDto, @CurrentUser() user: AuthUser) {
    return this.service.submitAction(id, dto, user);
  }

  @Post('comments')
  createComment(@Body() dto: CreateCommentDto, @CurrentUser() user: AuthUser) {
    return this.service.createComment(dto, user);
  }

  @Post('scheduler/run')
  @Roles(RoleCode.ADMIN)
  runScheduler() {
    return this.service.createDueCycles();
  }
}
