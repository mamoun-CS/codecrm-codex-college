import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { Roles } from '../common/roles.decorator';
import { Permissions } from '../common/permissions.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

interface MarketingAccountDto {
  name: string;
  email: string;
  campaign_budget: number;
  spending_limit: number;
  reports_access: 'read-only' | 'full-access';
  leads_access: 'read-only' | 'no-access';
  status: 'active' | 'paused';
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  // In-memory storage for marketing accounts (temporary until database implementation)
  private marketingAccounts: Array<{
    id: number;
    name: string;
    email: string;
    campaign_budget: number;
    spending_limit: number;
    reports_access: 'read-only' | 'full-access';
    leads_access: 'read-only' | 'no-access';
    status: 'active' | 'paused';
    created_at: string;
    updated_at: string;
  }> = [
    {
      id: 1,
      name: 'Marketing Team A',
      email: 'marketing-a@company.com',
      campaign_budget: 5000,
      spending_limit: 10000,
      reports_access: 'full-access',
      leads_access: 'read-only',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Marketing Team B',
      email: 'marketing-b@company.com',
      campaign_budget: 3000,
      spending_limit: 8000,
      reports_access: 'read-only',
      leads_access: 'no-access',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Request() req) {
    return this.usersService.findAll(req.user);
  }

  @Put(':id/role')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @Request() req
  ) {
    return this.usersService.updateRole(+id, role, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteUser(@Param('id') id: string, @Request() req) {
    return this.usersService.deleteUser(+id, req.user);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  createUser(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.createUser(createUserDto, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    return this.usersService.updateUser(+id, updateUserDto, req.user);
  }

  @Get('allowed-roles')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getAllowedRoles(@Request() req) {
    return { roles: this.usersService.getAllowedRoles(req.user) };
  }

  @Get('sales-list')
  @Roles(UserRole.SALES)
  getSalesList(@Request() req) {
    return this.usersService.findAllSalesExcept(req.user.id);
  }

  @Get('transferrable-users')
   @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
   getTransferrableUsers(@Request() req) {
     return this.usersService.getTransferrableUsers(req.user);
   }

  // Marketing Account Management Endpoints
  @Get('marketing-accounts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getMarketingAccounts(@Request() req) {
    return this.marketingAccounts;
  }

  @Post('marketing-accounts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createMarketingAccount(@Body() data: MarketingAccountDto, @Request() req) {
    const newAccount = {
      id: Date.now(), // Generate unique ID
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.marketingAccounts.push(newAccount);
    return newAccount;
  }

  @Put('marketing-accounts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateMarketingAccount(@Param('id') id: string, @Body() data: Partial<MarketingAccountDto>, @Request() req) {
    const accountId = parseInt(id);
    const index = this.marketingAccounts.findIndex(acc => acc.id === accountId);

    if (index === -1) {
      throw new Error('Marketing account not found');
    }

    this.marketingAccounts[index] = {
      ...this.marketingAccounts[index],
      ...data,
      updated_at: new Date().toISOString(),
    };

    return this.marketingAccounts[index];
  }

  @Delete('marketing-accounts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteMarketingAccount(@Param('id') id: string, @Request() req) {
    const accountId = parseInt(id);
    const index = this.marketingAccounts.findIndex(acc => acc.id === accountId);

    if (index === -1) {
      throw new Error('Marketing account not found');
    }

    this.marketingAccounts.splice(index, 1);
    return { message: 'Marketing account deleted successfully' };
  }
}
